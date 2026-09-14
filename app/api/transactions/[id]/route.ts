import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { syncTransfer } from "@/lib/transfers";

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
