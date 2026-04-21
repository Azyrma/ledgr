import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function parseUtcDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function ym(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function addUTCMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function getDateRange(range: string, now: Date): { from: string; to: string } {
  const today = toIso(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const endOfLastMonth = toIso(new Date(y, m, 0));
  switch (range) {
    case "mtd":      return { from: toIso(new Date(y, m, 1)),      to: today          };
    case "1month":   return { from: toIso(new Date(y, m - 1, 1)),  to: endOfLastMonth };
    case "2month":   return { from: toIso(new Date(y, m - 2, 1)),  to: endOfLastMonth };
    case "3month":   return { from: toIso(new Date(y, m - 3, 1)),  to: endOfLastMonth };
    case "6month":   return { from: toIso(new Date(y, m - 6, 1)),  to: endOfLastMonth };
    case "ytd":      return { from: toIso(new Date(y, 0, 1)),      to: today          };
    case "lastyear": return { from: toIso(new Date(y - 1, 0, 1)),  to: toIso(new Date(y - 1, 11, 31)) };
    case "12m":      return { from: toIso(new Date(y - 1, m, now.getDate())), to: today };
    default:         return { from: "",    to: today };
  }
}

export function GET(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const dateRange = searchParams.get("dateRange") ?? "12m";
  const now = new Date();
  const today = toIso(now);

  const { from, to } = getDateRange(dateRange, now);

  // Use a very old date as the lower bound for "all time" so we can always use the
  // same parameterized SQL (avoids building different query strings per range).
  const sqlFrom = from || "0001-01-01";
  const sqlTo   = to;

  const accounts = db.prepare(`
    SELECT
      a.id, a.name, a.type, a.currency, a.color, a.initial_balance, a.exchange_rate,
      COALESCE(a.initial_balance + SUM(t.amount), a.initial_balance) AS balance,
      COALESCE(SUM(CASE WHEN t.amount > 0 AND t.date >= ? AND t.date <= ? THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.amount < 0 AND t.date >= ? AND t.date <= ? THEN t.amount ELSE 0 END), 0) AS expenses,
      COUNT(CASE WHEN t.date >= ? AND t.date <= ? THEN 1 END) AS transaction_count
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id
    ORDER BY a.name
  `).all(sqlFrom, sqlTo, sqlFrom, sqlTo, sqlFrom, sqlTo) as {
    id: number; balance: number; initial_balance: number; income: number;
    expenses: number; transaction_count: number; [key: string]: unknown;
  }[];

  // ── Sparkline: monthly end-of-balance for the selected period ──────────
  const deltaRows = db.prepare(`
    SELECT account_id, strftime('%Y-%m', date) AS ym, SUM(amount) AS delta
    FROM transactions
    GROUP BY account_id, ym
  `).all() as { account_id: number; ym: string; delta: number }[];

  const deltaMap = new Map<number, Map<string, number>>();
  for (const r of deltaRows) {
    if (!deltaMap.has(r.account_id)) deltaMap.set(r.account_id, new Map());
    deltaMap.get(r.account_id)!.set(r.ym, r.delta);
  }

  // Determine sparkline start/end months (always UTC so month arithmetic is stable)
  let sparkStart: Date;
  if (!from) {
    // All time: snap to Jan 1 of the earliest transaction year
    const earliest = db.prepare(`SELECT MIN(date) AS d FROM transactions`).get() as { d: string | null };
    sparkStart = earliest.d
      ? new Date(Date.UTC(parseUtcDate(earliest.d).getUTCFullYear(), 0, 1))
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  } else {
    const d = parseUtcDate(from);
    sparkStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  }

  const toDate   = parseUtcDate(to);
  const sparkEnd = new Date(Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1));
  const sparkMonths = Math.max(2,
    (sparkEnd.getUTCFullYear() - sparkStart.getUTCFullYear()) * 12 +
    (sparkEnd.getUTCMonth() - sparkStart.getUTCMonth()) + 1
  );

  // Current month (as ym string) — transactions after sparkEnd need to be removed
  // from the running balance before we start the backward sparkline sweep.
  const currentMonthYm = ym(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));

  const result = accounts.map((a) => {
    const byMonth = deltaMap.get(a.id) ?? new Map<string, number>();

    // Sum transactions that occurred AFTER sparkEnd up to the current month
    // (these are already baked into a.balance but shouldn't be in the sparkline)
    let subtractAfter = 0;
    let m = addUTCMonths(sparkEnd, 1);
    while (ym(m) <= currentMonthYm) {
      subtractAfter += byMonth.get(ym(m)) ?? 0;
      m = addUTCMonths(m, 1);
    }

    const sparkline: number[] = new Array(sparkMonths).fill(0);
    let subtract = subtractAfter;
    for (let i = sparkMonths - 1; i >= 0; i--) {
      sparkline[i] = a.balance - subtract;
      const monthDate = addUTCMonths(sparkStart, i);
      subtract += byMonth.get(ym(monthDate)) ?? 0;
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
