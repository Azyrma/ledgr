import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, type, currency, color, initial_balance } = await request.json();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      "UPDATE accounts SET name = ?, type = ?, currency = ?, color = ?, initial_balance = ? WHERE id = ?"
    ).run(name, type, currency, color, initial_balance, id);

    if (result.changes === 0) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
    if (result.changes === 0) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
