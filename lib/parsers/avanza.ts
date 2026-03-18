import type { ParsedTransaction } from "./types";

function parseSemicolonCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(";").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function parseSwedishNumber(str: string): number {
  // Swedish format uses comma as decimal separator: -11864,23
  const cleaned = str.replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned);
}

// Transaction types in Swedish
const BUY = "Köp";
const SELL = "Sälj";
const DIVIDEND = "Utdelning";

export function parseAvanza(text: string): ParsedTransaction[] {
  const rows = parseSemicolonCsv(text);

  // Header: Datum;Konto;Typ av transaktion;Värdepapper/beskrivning;Antal;Kurs;Belopp;...
  const headerIdx = rows.findIndex((r) => r[0] === "Datum");
  if (headerIdx === -1) throw new Error("Could not find header row in Avanza file.");

  const transactions: ParsedTransaction[] = [];

  for (const row of rows.slice(headerIdx + 1)) {
    if (!row[0] || row.length < 7) continue;

    const date = row[0].trim();           // Already YYYY-MM-DD
    const txType = row[2].trim();         // Typ av transaktion
    const security = row[3].trim();       // Värdepapper/beskrivning
    const antalStr = row[4].trim();       // Antal (shares)
    const beloppStr = row[6].trim();      // Belopp (amount)
    const instrumentCurrency = row[10]?.trim() || "SEK"; // Instrumentvaluta
    const isin = row[11]?.trim() || "";   // ISIN

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!beloppStr) continue;

    const amount = parseSwedishNumber(beloppStr);
    if (isNaN(amount)) continue;

    const description = security !== txType ? `${txType} ${security}` : txType;

    const tx: ParsedTransaction = {
      date,
      description,
      amount,
      category: "",
    };

    // For buy/sell — extract shares and holding info
    if ((txType === BUY || txType === SELL) && security) {
      const shares = antalStr ? parseSwedishNumber(antalStr) : 0;
      tx.ticker = security;
      tx.shares = shares;
      tx.holdingName = security;
      tx.holdingCurrency = instrumentCurrency || "SEK";
      if (isin) tx.isin = isin;
    } else if (txType === DIVIDEND && security) {
      // Dividends link to the holding but don't affect share count
      tx.ticker = security;
      tx.shares = 0;
      tx.holdingName = security;
      tx.holdingCurrency = instrumentCurrency || "SEK";
      if (isin) tx.isin = isin;
    }

    transactions.push(tx);
  }

  return transactions;
}
