import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, target_amount, target_date, color } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!(Number(target_amount) > 0)) return NextResponse.json({ error: "Target amount must be positive." }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      "UPDATE goals SET name = ?, target_amount = ?, target_date = ?, color = ? WHERE id = ?"
    ).run(name.trim(), Number(target_amount), target_date || null, color || null, Number(id));
    if (result.changes === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = db.prepare("DELETE FROM goals WHERE id = ?").run(Number(id));
    if (result.changes === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
