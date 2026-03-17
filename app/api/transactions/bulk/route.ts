import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    const { ids, category, reimbursable } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: "No ids provided." }, { status: 400 });

    const db = getDb();
    const placeholders = ids.map(() => "?").join(", ");

    if (reimbursable !== undefined) {
      db.prepare(`UPDATE transactions SET reimbursable = ? WHERE id IN (${placeholders})`)
        .run(reimbursable ? 1 : 0, ...ids);
    } else {
      db.prepare(`UPDATE transactions SET category = ?, needs_review = 0 WHERE id IN (${placeholders})`)
        .run(category ?? "", ...ids);
    }

    return NextResponse.json({ updated: ids.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0)
      return NextResponse.json({ error: "No ids provided." }, { status: 400 });

    const db = getDb();
    const placeholders = ids.map(() => "?").join(", ");
    db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);

    return NextResponse.json({ deleted: ids.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
