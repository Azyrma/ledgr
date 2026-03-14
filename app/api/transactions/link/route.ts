import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length !== 2)
      return NextResponse.json({ error: "Provide exactly 2 ids." }, { status: 400 });

    const [a, b] = ids.map(Number);
    if (!a || !b || a === b)
      return NextResponse.json({ error: "Invalid ids." }, { status: 400 });

    const db = getDb();
    const found = db.prepare("SELECT id FROM transactions WHERE id IN (?, ?)").all(a, b) as { id: number }[];
    if (found.length !== 2)
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

    const stmt = db.prepare("UPDATE transactions SET linked_transaction_id = ? WHERE id = ?");
    db.transaction(() => { stmt.run(b, a); stmt.run(a, b); })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const numId = Number(id);
    if (!numId)
      return NextResponse.json({ error: "Provide a valid id." }, { status: 400 });

    const db = getDb();
    const row = db.prepare("SELECT linked_transaction_id FROM transactions WHERE id = ?")
      .get(numId) as { linked_transaction_id: number | null } | undefined;

    if (!row)
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

    const stmt = db.prepare("UPDATE transactions SET linked_transaction_id = NULL WHERE id = ?");
    db.transaction(() => {
      if (row.linked_transaction_id !== null) stmt.run(row.linked_transaction_id);
      stmt.run(numId);
    })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
