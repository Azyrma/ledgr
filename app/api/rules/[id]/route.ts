import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { pattern, category } = await request.json();
    if (!pattern?.trim()) return NextResponse.json({ error: "Pattern is required." }, { status: 400 });
    if (!category?.trim()) return NextResponse.json({ error: "Category is required." }, { status: 400 });

    const db = getDb();
    const result = db.prepare("UPDATE rules SET pattern = ?, category = ? WHERE id = ?")
      .run(pattern.trim(), category.trim(), Number(id));
    if (result.changes === 0) return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const result = db.prepare("DELETE FROM rules WHERE id = ?").run(Number(id));
    if (result.changes === 0) return NextResponse.json({ error: "Rule not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
