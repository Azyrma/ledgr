import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const categories = db.prepare(
    "SELECT id, name, parent_id, color, icon, is_system FROM categories ORDER BY is_system DESC, name ASC"
  ).all();
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  try {
    const { name, parent_id, color, icon } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!parent_id)    return NextResponse.json({ error: "Parent is required." }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO categories (name, parent_id, color, icon) VALUES (?, ?, ?, ?)"
    ).run(name.trim(), parent_id, color ?? null, icon ?? null);

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
