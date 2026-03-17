import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const rows = db
    .prepare("SELECT DISTINCT category FROM transactions WHERE category != '' ORDER BY category")
    .all() as { category: string }[];
  return NextResponse.json(rows.map((r) => r.category));
}
