import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM tags ORDER BY id").all();
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, color, icon } = await request.json();
    if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });
    const db = getDb();
    const result = db.prepare("INSERT INTO tags (name, color, icon, is_system) VALUES (?, ?, ?, 0)")
      .run(name, color ?? null, icon ?? null);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, color, icon } = await request.json();
    if (!id) return NextResponse.json({ error: "ID required." }, { status: 400 });
    const db = getDb();
    db.prepare("UPDATE tags SET color = ?, icon = ? WHERE id = ?").run(color ?? null, icon ?? null, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const db = getDb();
    const tag = db.prepare("SELECT is_system FROM tags WHERE id = ?").get(id) as { is_system: number } | undefined;
    if (!tag) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (tag.is_system) return NextResponse.json({ error: "System tags cannot be deleted." }, { status: 403 });
    db.prepare("DELETE FROM tags WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
