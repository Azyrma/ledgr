import type Database from "better-sqlite3";

const CURRENCIES = ["EUR", "USD", "SEK", "GBP"];

// CHF per 1 unit of holding h's currency. Requires aliases h (holdings), a (accounts)
// and c (LEFT JOIN exchange_rate_cache c ON c.currency = h.currency) in scope.
// Falls back to the account rate when the cache has no entry (no API key yet).
export const HOLDING_RATE_SQL =
  "COALESCE(c.rate_to_chf, CASE WHEN h.currency = 'CHF' THEN 1.0 ELSE a.exchange_rate END)";

// Per-account market value of all holdings, in CHF: (account_id, holdings_chf)
export const HOLDINGS_CHF_BY_ACCOUNT_SQL = `
  SELECT h.account_id, SUM(h.shares * COALESCE(h.current_price, 0) * ${HOLDING_RATE_SQL}) AS holdings_chf
  FROM holdings h
  JOIN accounts a ON a.id = h.account_id
  LEFT JOIN exchange_rate_cache c ON c.currency = h.currency
  GROUP BY h.account_id
`;
const REFRESH_DAYS = 7;

export async function refreshExchangeRates(db: Database.Database): Promise<void> {
  // Check when rates were last fetched
  const latest = db
    .prepare("SELECT fetched_at FROM exchange_rate_cache ORDER BY fetched_at DESC LIMIT 1")
    .get() as { fetched_at: string } | undefined;

  if (latest) {
    const daysSince = (Date.now() - new Date(latest.fetched_at).getTime()) / 86_400_000;
    if (daysSince < REFRESH_DAYS) {
      console.log(`[exchange-rates] Rates are fresh (${daysSince.toFixed(1)}d old), skipping fetch`);
      return;
    }
  }

  const apiKey = process.env.CURRENCYAPI_KEY;
  if (!apiKey) {
    console.warn("[exchange-rates] CURRENCYAPI_KEY not set — skipping rate refresh");
    return;
  }

  try {
    const url =
      `https://api.currencyapi.com/v3/latest` +
      `?apikey=${apiKey}&base_currency=CHF&currencies=${CURRENCIES.join(",")}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as {
      data: Record<string, { value: number }>;
    };

    const now = new Date().toISOString();
    const upsertCache = db.prepare(
      "INSERT OR REPLACE INTO exchange_rate_cache (currency, rate_to_chf, fetched_at) VALUES (?, ?, ?)"
    );
    const updateAccount = db.prepare(
      "UPDATE accounts SET exchange_rate = ? WHERE currency = ?"
    );

    db.transaction(() => {
      for (const [currency, { value }] of Object.entries(json.data)) {
        // value = how many of this currency per 1 CHF
        // rate_to_chf = how many CHF per 1 unit of this currency
        const rateToChf = 1 / value;
        upsertCache.run(currency, rateToChf, now);
        updateAccount.run(rateToChf, currency);
      }
    })();

    console.log(`[exchange-rates] Updated rates at ${now}:`,
      Object.fromEntries(
        Object.entries(json.data).map(([c, { value }]) => [c, `${(1 / value).toFixed(6)} CHF`])
      )
    );
  } catch (err) {
    console.error("[exchange-rates] Failed to fetch rates:", err);
  }
}
