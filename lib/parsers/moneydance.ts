import type { ParsedTransaction } from "./types";

function parseAmount(str: string): number {
  // "Fr. -1.80" or "kr. -34.00" → -1.80
  return parseFloat(str.replace(/^[A-Za-z]+\.\s*/, "").replace(/,/g, ""));
}

function parseDate(str: string): string {
  // DD/MM/YYYY → YYYY-MM-DD
  const [d, m, y] = str.split("/");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parseMoneydance(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex((l) => l.startsWith("Account,Date,Cheque#"));
  if (headerIdx === -1) throw new Error("Could not find header row in Moneydance file.");

  const transactions: ParsedTransaction[] = [];
  for (const line of lines.slice(headerIdx + 1)) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    if (cols.length < 7) continue;
    const account = cols[0].trim();
    const dateStr = cols[1].trim();
    const description = cols[3].trim();
    const category = cols[4].trim();
    const amountStr = cols[6].trim();
    if (!account || description === "Beginning Balance") continue;
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) continue;
    const amount = parseAmount(amountStr);
    if (isNaN(amount)) continue;
    transactions.push({ date: parseDate(dateStr), description, amount, category });
  }
  return transactions;
}
