import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  const db = getDb();
  const rules = db.prepare("SELECT id, pattern, category, created_at FROM rules ORDER BY id").all();
  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  try {
    const { pattern, category } = await request.json();
    if (!pattern?.trim()) return NextResponse.json({ error: "Pattern is required." }, { status: 400 });
    if (!category?.trim()) return NextResponse.json({ error: "Category is required." }, { status: 400 });

    const db = getDb();
    const result = db.prepare("INSERT INTO rules (pattern, category) VALUES (?, ?)")
      .run(pattern.trim(), category.trim());
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
