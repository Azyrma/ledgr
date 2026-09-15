import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { HOLDING_RATE_SQL } from "@/lib/exchange-rates";

export function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("account_id");
  const db = getDb();

  const sql = `
    SELECT h.*,
      (h.shares * h.avg_cost_per_share) AS total_value,
      CASE WHEN h.current_price IS NOT NULL THEN (h.shares * h.current_price) ELSE NULL END AS market_value,
      ${HOLDING_RATE_SQL} AS rate_to_chf
    FROM holdings h
    JOIN accounts a ON a.id = h.account_id
    LEFT JOIN exchange_rate_cache c ON c.currency = h.currency
  `;

  if (accountId) {
    const rows = db.prepare(sql + " WHERE h.account_id = ? ORDER BY h.ticker").all(Number(accountId));
    return NextResponse.json(rows);
  }

  const rows = db.prepare(sql + " ORDER BY h.ticker").all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try {
    const { account_id, ticker, name, shares, avg_cost_per_share, currency, isin } = await request.json();
    if (!account_id || !name || shares == null || avg_cost_per_share == null) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO holdings (account_id, ticker, name, shares, avg_cost_per_share, currency, isin) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(account_id, (ticker ?? "").toUpperCase(), name, shares, avg_cost_per_share, currency ?? "USD", isin ?? "");

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ticker, name, shares, avg_cost_per_share, currency, isin } = await request.json();
    if (!id) return NextResponse.json({ error: "ID is required." }, { status: 400 });

    const db = getDb();
    const result = db.prepare(
      "UPDATE holdings SET ticker = ?, name = ?, shares = ?, avg_cost_per_share = ?, currency = ?, isin = ? WHERE id = ?"
    ).run((ticker ?? "").toUpperCase(), name, shares, avg_cost_per_share, currency ?? "USD", isin ?? "", id);

    if (result.changes === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID is required." }, { status: 400 });

  const db = getDb();
  const result = db.prepare("DELETE FROM holdings WHERE id = ?").run(Number(id));
  if (result.changes === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
