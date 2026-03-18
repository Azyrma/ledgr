import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const accounts = db.prepare(`
    SELECT
      a.id,
      a.name,
      a.type,
      a.currency,
      a.color,
      a.initial_balance,
      a.exchange_rate,
      COALESCE(a.initial_balance + SUM(t.amount), a.initial_balance) AS balance,
      COALESCE(SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END), 0) AS expenses,
      COUNT(t.id) AS transaction_count
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id
    ORDER BY a.name
  `).all();
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  try {
    const { name, type, currency, color, initial_balance, exchange_rate } = await request.json();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

    const db = getDb();
    const cur = currency ?? "CHF";

    // Use cached exchange rate if user didn't provide one
    let rate = exchange_rate;
    if (rate == null && cur !== "CHF") {
      const cached = db.prepare(
        "SELECT rate_to_chf FROM exchange_rate_cache WHERE currency = ?"
      ).get(cur) as { rate_to_chf: number } | undefined;
      rate = cached?.rate_to_chf ?? 1.0;
    }

    const result = db.prepare(
      "INSERT INTO accounts (name, type, currency, color, initial_balance, exchange_rate) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(name, type ?? "checking", cur, color ?? "#6366f1", initial_balance ?? 0, rate ?? 1.0);

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
