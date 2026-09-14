import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const FREQUENCIES: string[] = ["weekly", "monthly", "quarterly", "yearly"];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { title, pattern, frequency } = await request.json();
    if (!title?.trim() || !pattern?.trim())
      return NextResponse.json({ error: "Title and pattern are required." }, { status: 400 });
    if (!FREQUENCIES.includes(frequency))
      return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });

    const db = getDb();
    const result = db.prepare("UPDATE recurring SET title = ?, pattern = ?, frequency = ? WHERE id = ?")
      .run(title.trim(), pattern.trim(), frequency, Number(id));
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
    const result = db.prepare("DELETE FROM recurring WHERE id = ?").run(Number(id));
    if (result.changes === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
