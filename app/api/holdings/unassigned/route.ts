import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { INVESTMENT_TX_WHERE } from "@/lib/holdings";

// Investment purchases/sells/dividends, assigned (ticker set) or not
export function GET() {
  const rows = getDb().prepare(`
    SELECT t.id, t.account_id, t.date, t.description, t.amount, t.ticker, t.shares
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    WHERE ${INVESTMENT_TX_WHERE}
    ORDER BY t.date DESC, t.id DESC
  `).all();
  return NextResponse.json(rows);
}
