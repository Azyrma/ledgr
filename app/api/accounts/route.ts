import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET() {
  const db = getDb();
  const now = new Date();

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
  `).all() as { id: number; balance: number; initial_balance: number; [key: string]: unknown }[];

  // Compute 12-month balance sparkline per account (end-of-month balance in account currency)
  const deltaRows = db.prepare(`
    SELECT account_id, strftime('%Y-%m', date) AS ym, SUM(amount) AS delta
    FROM transactions
    GROUP BY account_id, ym
  `).all() as { account_id: number; ym: string; delta: number }[];

  // Build map: account_id -> ym -> delta
  const deltaMap = new Map<number, Map<string, number>>();
  for (const r of deltaRows) {
    if (!deltaMap.has(r.account_id)) deltaMap.set(r.account_id, new Map());
    deltaMap.get(r.account_id)!.set(r.ym, r.delta);
  }

  const result = accounts.map((a) => {
    const byMonth = deltaMap.get(a.id) ?? new Map<string, number>();
    // Work backwards from current balance to get end-of-month balance for each of last 12 months
    const sparkline: number[] = new Array(12).fill(0);
    let subtract = 0;
    for (let i = 11; i >= 0; i--) {
      sparkline[i] = a.balance - subtract;
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      subtract += byMonth.get(ym) ?? 0;
    }
    return { ...a, sparkline };
  });

  return NextResponse.json(result);
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
