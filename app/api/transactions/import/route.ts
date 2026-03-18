import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseFile, detectBankType } from "@/lib/parsers";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const accountId = Number(formData.get("accountId"));

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!accountId) return NextResponse.json({ error: "No account selected." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniff = buffer.subarray(0, 200).toString("utf-8");

    if (detectBankType(file.name, sniff) === "unknown") {
      return NextResponse.json(
        { error: `Unrecognised file: "${file.name}". Expected a PostFinance, Handelsbanken, Moneydance, or Avanza export.` },
        { status: 400 }
      );
    }

    const transactions = await parseFile(file.name, buffer);

    const db = getDb();
    const account = db.prepare("SELECT id, type, currency FROM accounts WHERE id = ?").get(accountId) as
      | { id: number; type: string; currency: string }
      | undefined;
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const cats = db.prepare("SELECT id, name, parent_id, is_system FROM categories").all() as FlatCat[];
    const nodeMap = buildCategoryNodeMap(cats);
    const validPaths = new Set<string>();
    nodeMap.forEach((cat, id) => { if (!cat.is_system) validPaths.add(getCategoryPath(id, nodeMap)); });
    // Duplicate check — match on date + description + amount within the same account
    type ExistingRow = { date: string; description: string; amount: number };
    const existing = db
      .prepare("SELECT date, description, amount FROM transactions WHERE account_id = ?")
      .all(accountId) as ExistingRow[];
    const existingKeys = new Set(existing.map((r) => `${r.date}|${r.description}|${r.amount}`));

    const duplicates = transactions.filter(
      (t) => existingKeys.has(`${t.date}|${t.description}|${t.amount}`)
    );

    const skipDuplicates = formData.get("skipDuplicates") === "true";
    const importAll      = formData.get("importAll")      === "true";

    // First-pass check: return duplicates for the user to review
    if (duplicates.length > 0 && !skipDuplicates && !importAll) {
      return NextResponse.json({ duplicates }, { status: 409 });
    }

    const rowsToInsert = skipDuplicates
      ? transactions.filter((t) => !existingKeys.has(`${t.date}|${t.description}|${t.amount}`))
      : transactions;

    const insert = db.prepare(
      "INSERT INTO transactions (account_id, date, description, amount, category, needs_review, import_id, ticker, shares) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertImport = db.prepare(
      "INSERT INTO imports (filename, account_id, count) VALUES (?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof rowsToInsert) => {
      const importRecord = insertImport.run(file.name, accountId, rows.length);
      const importId = importRecord.lastInsertRowid;
      for (const t of rows) {
        const needsReview = t.category !== "" && !validPaths.has(t.category) ? 1 : 0;
        insert.run(accountId, t.date, t.description, t.amount, t.category, needsReview, importId, t.ticker ?? "", t.shares ?? 0);
      }
    });

    insertMany(rowsToInsert);

    // For investment accounts, sync holdings from all transactions
    if (account.type === "investment") {
      syncHoldings(db, accountId, rowsToInsert, account.currency);
    }

    return NextResponse.json({ imported: rowsToInsert.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Recalculate holdings for each unique ticker that was imported.
 * Uses all transactions for that ticker in the account (not just the import batch)
 * to ensure correctness even on re-import.
 */
function syncHoldings(
  db: ReturnType<typeof getDb>,
  accountId: number,
  imported: { ticker?: string; holdingName?: string; holdingCurrency?: string; isin?: string }[],
  accountCurrency: string
) {
  const tickers = [...new Set(imported.filter((t) => t.ticker).map((t) => t.ticker!))];
  if (tickers.length === 0) return;

  // Build a map of ticker -> display name and currency from the imported data
  const metaMap = new Map<string, { name: string; currency: string; isin: string }>();
  for (const t of imported) {
    if (t.ticker && !metaMap.has(t.ticker)) {
      metaMap.set(t.ticker, {
        name: t.holdingName ?? t.ticker,
        currency: t.holdingCurrency ?? accountCurrency,
        isin: t.isin ?? "",
      });
    }
  }

  type TxRow = { shares: number; amount: number };

  for (const ticker of tickers) {
    // Get ALL transactions for this ticker in this account, chronologically
    const txs = db.prepare(
      "SELECT shares, amount FROM transactions WHERE account_id = ? AND ticker = ? ORDER BY date ASC, id ASC"
    ).all(accountId, ticker) as TxRow[];

    let totalShares = 0;
    let totalCost = 0;

    for (const tx of txs) {
      if (tx.shares > 0) {
        // Buy: add shares, add to cost basis
        totalCost += Math.abs(tx.amount);
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
    const meta = metaMap.get(ticker) ?? { name: ticker, currency: accountCurrency, isin: "" };

    const existingHolding = db.prepare(
      "SELECT id FROM holdings WHERE account_id = ? AND ticker = ?"
    ).get(accountId, ticker) as { id: number } | undefined;

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
