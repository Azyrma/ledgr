import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { date, amount, note } = await request.json();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? ""))
      return NextResponse.json({ error: "date (yyyy-mm-dd) required." }, { status: 400 });
    if (!Number.isFinite(Number(amount)) || Number(amount) === 0)
      return NextResponse.json({ error: "Non-zero amount required." }, { status: 400 });

    const db = getDb();
    const goal = db.prepare("SELECT id FROM goals WHERE id = ?").get(Number(id));
    if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

    const result = db.prepare(
      "INSERT INTO goal_contributions (goal_id, date, amount, note) VALUES (?, ?, ?, ?)"
    ).run(Number(id), date, Number(amount), note ?? "");
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contributionId = request.nextUrl.searchParams.get("contribution_id");
    if (!contributionId) return NextResponse.json({ error: "contribution_id required." }, { status: 400 });

    const db = getDb();
    const result = db.prepare("DELETE FROM goal_contributions WHERE id = ? AND goal_id = ?")
      .run(Number(contributionId), Number(id));
    if (result.changes === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
