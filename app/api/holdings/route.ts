import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET(request: NextRequest) {
  const accountId = request.nextUrl.searchParams.get("account_id");
  const db = getDb();

  const sql = `
    SELECT *,
      (shares * avg_cost_per_share) AS total_value,
      CASE WHEN current_price IS NOT NULL THEN (shares * current_price) ELSE NULL END AS market_value
    FROM holdings
  `;

  if (accountId) {
    const rows = db.prepare(sql + " WHERE account_id = ? ORDER BY ticker").all(Number(accountId));
    return NextResponse.json(rows);
  }

  const rows = db.prepare(sql + " ORDER BY ticker").all();
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  try {
    const { account_id, ticker, name, shares, avg_cost_per_share, currency, isin } = await request.json();
    if (!account_id || !ticker || !name || shares == null || avg_cost_per_share == null) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(
      "INSERT INTO holdings (account_id, ticker, name, shares, avg_cost_per_share, currency, isin) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(account_id, ticker.toUpperCase(), name, shares, avg_cost_per_share, currency ?? "USD", isin ?? "");

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
    ).run(ticker.toUpperCase(), name, shares, avg_cost_per_share, currency ?? "USD", isin ?? "", id);

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
