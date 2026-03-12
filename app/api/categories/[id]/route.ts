import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const db = getDb();
    const cat = db.prepare("SELECT is_system FROM categories WHERE id = ?").get(id) as { is_system: number } | undefined;
    if (!cat)           return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (cat.is_system)  return NextResponse.json({ error: "System categories cannot be renamed." }, { status: 403 });

    db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(name.trim(), id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const cat = db.prepare("SELECT is_system FROM categories WHERE id = ?").get(id) as { is_system: number } | undefined;
    if (!cat)           return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (cat.is_system)  return NextResponse.json({ error: "System categories cannot be deleted." }, { status: 403 });

    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
