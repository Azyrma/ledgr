import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { syncHoldings } from "@/lib/holdings";

type TxRow = { id: number; account_id: number; ticker: string; currency: string };
type HoldingRow = { id: number; ticker: string; name: string; currency: string; isin: string };

function loadTx(db: ReturnType<typeof getDb>, id: number) {
  return db.prepare(`
    SELECT t.id, t.account_id, t.ticker, a.currency
    FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE t.id = ?
  `).get(id) as TxRow | undefined;
}

// Link a transaction to a holding (existing or new) and recompute that holding
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_id, kind, holding_id, new_holding } = body as {
      transaction_id: number;
      kind: "buy" | "sell" | "dividend";
      shares?: number;
      price_per_share?: number;
      holding_id?: number;
      ticker?: string;
      new_holding?: { ticker: string; name: string; currency: string; isin?: string };
    };
    const shares = Number(body.shares ?? 0);
    const price = body.price_per_share == null ? null : Number(body.price_per_share);

    if (!["buy", "sell", "dividend"].includes(kind)) return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
    if (kind !== "dividend" && !(shares > 0)) return NextResponse.json({ error: "Shares must be greater than 0." }, { status: 400 });
    if (kind === "buy" && !(price != null && price >= 0)) return NextResponse.json({ error: "Price per share is required." }, { status: 400 });

    const db = getDb();
    const tx = loadTx(db, Number(transaction_id));
    if (!tx) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

    let holding: HoldingRow;
    if (holding_id) {
      const existing = db.prepare("SELECT id, ticker, name, currency, isin FROM holdings WHERE id = ? AND account_id = ?")
        .get(Number(holding_id), tx.account_id) as HoldingRow | undefined;
      if (!existing) return NextResponse.json({ error: "Holding not found." }, { status: 404 });
      // Hand-created holdings have no ticker yet — take one from the request
      const ticker = (existing.ticker || body.ticker || "").trim().toUpperCase();
      if (!ticker) return NextResponse.json({ error: "Ticker is required." }, { status: 400 });
      holding = { ...existing, ticker };
    } else if (new_holding?.ticker?.trim() && new_holding.name?.trim()) {
      holding = {
        id: 0,
        ticker: new_holding.ticker.trim().toUpperCase(),
        name: new_holding.name.trim(),
        currency: new_holding.currency || tx.currency,
        isin: (new_holding.isin ?? "").trim().toUpperCase(),
      };
    } else {
      return NextResponse.json({ error: "Choose a holding or enter ticker and name for a new one." }, { status: 400 });
    }

    const clash = db.prepare("SELECT id FROM holdings WHERE account_id = ? AND ticker = ? AND id != ?")
      .get(tx.account_id, holding.ticker, holding.id) as { id: number } | undefined;
    if (clash) return NextResponse.json({ error: `Ticker ${holding.ticker} is already used by another holding.` }, { status: 400 });

    const signedShares = kind === "buy" ? shares : kind === "sell" ? -shares : 0;
    db.transaction(() => {
      if (holding.id) db.prepare("UPDATE holdings SET ticker = ? WHERE id = ?").run(holding.ticker, holding.id);
      db.prepare("UPDATE transactions SET ticker = ?, shares = ?, price_per_share = ? WHERE id = ?")
        .run(holding.ticker, signedShares, kind === "buy" ? price : null, tx.id);
      syncHoldings(db, tx.account_id,
        [{ ticker: holding.ticker, holdingName: holding.name, holdingCurrency: holding.currency, isin: holding.isin }],
        tx.currency);
    })();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to assign." }, { status: 500 });
  }
}

// Unlink a transaction from its holding and recompute that holding
export function DELETE(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("transaction_id"));
  const db = getDb();
  const tx = loadTx(db, id);
  if (!tx) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  if (!tx.ticker) return NextResponse.json({ ok: true });

  const holding = db.prepare("SELECT id, ticker, name, currency, isin FROM holdings WHERE account_id = ? AND ticker = ?")
    .get(tx.account_id, tx.ticker) as HoldingRow | undefined;

  db.transaction(() => {
    db.prepare("UPDATE transactions SET ticker = '', shares = 0, price_per_share = NULL WHERE id = ?").run(tx.id);
    // Sync only touches tickers with remaining transactions or an existing holding row
    syncHoldings(db, tx.account_id,
      [{ ticker: tx.ticker, holdingName: holding?.name, holdingCurrency: holding?.currency, isin: holding?.isin }],
      tx.currency);
  })();
  return NextResponse.json({ ok: true });
}
