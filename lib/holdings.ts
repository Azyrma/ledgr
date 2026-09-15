import type Database from "better-sqlite3";

export type HoldingMeta = { ticker?: string; holdingName?: string; holdingCurrency?: string; isin?: string };

/**
 * Recalculate holdings for each unique ticker in `touched`, from ALL transactions
 * for that ticker in the account (average-cost method). Used by the bank import
 * and by manual assignment on the investments page.
 */
export function syncHoldings(
  db: Database.Database,
  accountId: number,
  touched: HoldingMeta[],
  accountCurrency: string
) {
  const tickers = [...new Set(touched.filter((t) => t.ticker).map((t) => t.ticker!))];
  if (tickers.length === 0) return;

  // Build a map of ticker -> display name and currency from the touched data
  const metaMap = new Map<string, { name: string; currency: string; isin: string }>();
  for (const t of touched) {
    if (t.ticker && !metaMap.has(t.ticker)) {
      metaMap.set(t.ticker, {
        name: t.holdingName ?? t.ticker,
        currency: t.holdingCurrency ?? accountCurrency,
        isin: t.isin ?? "",
      });
    }
  }

  type TxRow = { shares: number; amount: number; price_per_share: number | null };

  for (const ticker of tickers) {
    // Get ALL transactions for this ticker in this account, chronologically
    const txs = db.prepare(
      "SELECT shares, amount, price_per_share FROM transactions WHERE account_id = ? AND ticker = ? ORDER BY date ASC, id ASC"
    ).all(accountId, ticker) as TxRow[];

    const meta = metaMap.get(ticker) ?? { name: ticker, currency: accountCurrency, isin: "" };
    const existingHolding = db.prepare(
      "SELECT id FROM holdings WHERE account_id = ? AND ticker = ?"
    ).get(accountId, ticker) as { id: number } | undefined;

    // Only dividends (shares = 0) linked so far: keep a hand-entered position untouched
    if (!txs.some((tx) => tx.shares !== 0)) {
      if (!existingHolding && txs.length > 0) {
        db.prepare(
          "INSERT INTO holdings (account_id, ticker, name, shares, avg_cost_per_share, currency, isin) VALUES (?, ?, ?, 0, 0, ?, ?)"
        ).run(accountId, ticker, meta.name, meta.currency, meta.isin);
      }
      continue;
    }

    let totalShares = 0;
    let totalCost = 0;

    for (const tx of txs) {
      if (tx.shares > 0) {
        // Buy: add shares, add to cost basis (in holding currency when a price is stored)
        totalCost += tx.price_per_share != null ? tx.shares * tx.price_per_share : Math.abs(tx.amount);
        totalShares += tx.shares;
      } else if (tx.shares < 0) {
        // Sell: reduce shares, reduce cost proportionally (avg cost method)
        const sellShares = Math.abs(tx.shares);
        if (totalShares > 0) {
          const costPerShare = totalCost / totalShares;
          totalCost -= costPerShare * sellShares;
        }
        totalShares -= sellShares;
      }
      // Dividends (shares = 0, amount > 0) don't affect holdings
    }

    const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

    if (totalShares <= 0.0001) {
      // No shares left — remove holding if it exists
      if (existingHolding) {
        db.prepare("DELETE FROM holdings WHERE id = ?").run(existingHolding.id);
      }
    } else if (existingHolding) {
      db.prepare(
        "UPDATE holdings SET name = ?, shares = ?, avg_cost_per_share = ?, currency = ?, isin = ? WHERE id = ?"
      ).run(meta.name, totalShares, avgCost, meta.currency, meta.isin, existingHolding.id);
    } else {
      db.prepare(
        "INSERT INTO holdings (account_id, ticker, name, shares, avg_cost_per_share, currency, isin) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(accountId, ticker, meta.name, totalShares, avgCost, meta.currency, meta.isin);
    }
  }
}

// Investment-category transactions in investment accounts (buys, sells, dividends).
// Transfers are excluded: both sides of a linked transfer carry linked_transaction_id.
export const INVESTMENT_TX_WHERE = `
  a.type = 'investment'
  AND t.linked_transaction_id IS NULL
  AND t.category NOT LIKE 'Transfer:%'
  AND (t.category = 'Savings: Investment' OR t.category LIKE 'Savings: Investment:%')
`;
