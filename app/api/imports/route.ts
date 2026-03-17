import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

type ImportRow = {
  id: number;
  filename: string;
  account_id: number;
  account_name: string;
  count: number;
  imported_at: string;
};

// GET /api/imports/latest — returns the most recent import, or null
export async function GET() {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT i.id, i.filename, i.account_id, a.name AS account_name, i.count, i.imported_at
       FROM imports i JOIN accounts a ON i.account_id = a.id
       ORDER BY i.imported_at DESC, i.id DESC LIMIT 1`
    )
    .get() as ImportRow | undefined;

  return NextResponse.json(row ?? null);
}

// DELETE /api/imports?id=N — deletes all transactions for that import, then the import record
export async function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const db = getDb();
  const deleted = db
    .prepare("DELETE FROM transactions WHERE import_id = ?")
    .run(id);
  db.prepare("DELETE FROM imports WHERE id = ?").run(id);

  return NextResponse.json({ deleted: deleted.changes });
}
