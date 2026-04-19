import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type HoldingRow = {
  id: number;
  isin: string;
  ticker: string;
  currency: string;
};

export async function POST(request: NextRequest) {
  try {
    const { account_id } = await request.json();

    const db = getDb();

    // Get holdings that have ISINs for price lookup
    const holdings = (account_id
      ? db.prepare("SELECT id, isin, ticker, currency FROM holdings WHERE account_id = ?").all(account_id)
      : db.prepare("SELECT id, isin, ticker, currency FROM holdings").all()
    ) as HoldingRow[];

    const holdingsWithIsin = holdings.filter((h) => h.isin);
    if (holdingsWithIsin.length === 0) {
      return NextResponse.json({ updated: 0, message: "No holdings with ISIN codes to look up." });
    }

    const now = new Date().toISOString();
    let updated = 0;
    const errors: string[] = [];

    for (const holding of holdingsWithIsin) {
      try {
        // ISIN doesn't work with quote() directly — search first to resolve the Yahoo symbol
        const searchResult = await yf.search(holding.isin);
        const symbol = searchResult?.quotes?.[0]?.symbol;
        if (!symbol) {
          errors.push(`${holding.ticker}: ISIN not found on Yahoo`);
          continue;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quote: any = await yf.quote(symbol as string);
        if (quote && quote.regularMarketPrice != null) {
          db.prepare(
            "UPDATE holdings SET current_price = ?, price_updated_at = ? WHERE id = ?"
          ).run(Number(quote.regularMarketPrice), now, holding.id);
          updated++;
        } else {
          errors.push(`${holding.ticker}: no price data`);
        }
      } catch {
        errors.push(`${holding.ticker}: lookup failed`);
      }
    }

    return NextResponse.json({ updated, total: holdingsWithIsin.length, errors });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Price fetch failed." },
      { status: 500 },
    );
  }
}
