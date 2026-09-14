import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const db = getDb();
    const goals = db.prepare(`
      SELECT g.id, g.name, g.target_amount, g.target_date, g.color, g.created_at,
             COALESCE(SUM(c.amount), 0) AS saved
      FROM goals g
      LEFT JOIN goal_contributions c ON c.goal_id = g.id
      GROUP BY g.id
      ORDER BY g.id
    `).all() as {
      id: number; name: string; target_amount: number; target_date: string | null;
      color: string | null; created_at: string; saved: number;
    }[];

    const contribStmt = db.prepare(
      "SELECT id, date, amount, note FROM goal_contributions WHERE goal_id = ? ORDER BY date, id"
    );

    const now = new Date();
    const result = goals.map((g) => {
      // Auto-monthly: what's needed per remaining month to hit the target on time.
      let monthly_needed: number | null = null;
      if (g.target_date && g.saved < g.target_amount) {
        const target = new Date(g.target_date + "T00:00:00Z");
        const months = (target.getUTCFullYear() - now.getUTCFullYear()) * 12
          + (target.getUTCMonth() - now.getUTCMonth());
        monthly_needed = months > 0
          ? (g.target_amount - g.saved) / months
          : g.target_amount - g.saved;
      }
      return { ...g, monthly_needed, contributions: contribStmt.all(g.id) };
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, target_amount, target_date, color } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!(Number(target_amount) > 0)) return NextResponse.json({ error: "Target amount must be positive." }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO goals (name, target_amount, target_date, color) VALUES (?, ?, ?, ?)"
    ).run(name.trim(), Number(target_amount), target_date || null, color || null);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
