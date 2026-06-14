import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type Database from "better-sqlite3";

type TxRow = {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  reimbursable: number;
  ticker: string;
  shares: number;
  linked_transaction_id: number | null;
};

// When a transaction's category is set to "Transfer: <Account>", mirror it into
// that account: create a linked transaction with the same data, an inverted
// amount, and a category that points back to the source account.
function syncTransfer(db: Database.Database, txId: number): boolean {
  const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(txId) as TxRow | undefined;
  if (!tx) return false;

  const match = /^Transfer:\s*(.+)$/.exec(tx.category);
  if (!match) return false;
  if (tx.linked_transaction_id !== null) return false; // already mirrored

  const targetName = match[1].trim();
  const target = db.prepare("SELECT id, name FROM accounts WHERE name = ?")
    .get(targetName) as { id: number; name: string } | undefined;
  if (!target || target.id === tx.account_id) return false;

  const source = db.prepare("SELECT name FROM accounts WHERE id = ?")
    .get(tx.account_id) as { name: string } | undefined;
  const mirrorCategory = source ? `Transfer: ${source.name}` : "";

  db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO transactions
         (account_id, date, description, amount, category, reimbursable, ticker, shares, linked_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      target.id, tx.date, tx.description, -tx.amount, mirrorCategory,
      tx.reimbursable, tx.ticker, tx.shares, tx.id
    );
    db.prepare("UPDATE transactions SET linked_transaction_id = ? WHERE id = ?")
      .run(result.lastInsertRowid, tx.id);
  })();

  return true;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!numId) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await request.json();
    const { date, description, account_id, category, amount, reimbursable } = body;

    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (date        !== undefined) { fields.push("date = ?");        values.push(String(date)); }
    if (description !== undefined) { fields.push("description = ?"); values.push(String(description)); }
    if (account_id  !== undefined) { fields.push("account_id = ?");  values.push(Number(account_id)); }
    if (category    !== undefined) { fields.push("category = ?"); fields.push("needs_review = 0"); values.push(String(category)); }
    if (amount        !== undefined) { fields.push("amount = ?");        values.push(Number(amount)); }
    if (reimbursable  !== undefined) { fields.push("reimbursable = ?");  values.push(reimbursable ? 1 : 0); }

    if (fields.length === 0)
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    values.push(numId);
    const db = getDb();
    db.prepare(`UPDATE transactions SET ${fields.join(", ")} WHERE id = ?`).run(...values);

    let transferCreated = false;
    if (category !== undefined) transferCreated = syncTransfer(db, numId);

    return NextResponse.json({ ok: true, transferCreated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}
