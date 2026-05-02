import type { ParsedTransaction } from "./types";

function stripExcelLiteral(value: string): string {
  const v = value.trim();
  if (v.startsWith('="') && v.endsWith('"')) return v.slice(2, -1);
  return v;
}

function parseSemicolonCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(";").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

function parseDate(str: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const [d, m, y] = str.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parsePostfinance(text: string): ParsedTransaction[] {
  const rows = parseSemicolonCsv(text);

  const headerIdx = rows.findIndex((r) => r[0] === "Date");
  if (headerIdx === -1) throw new Error("Could not find header row in PostFinance file.");

  const transactions: ParsedTransaction[] = [];

  for (const row of rows.slice(headerIdx + 1)) {
    if (!row[0] || row.length < 5) continue;

    const dateStr = row[0].trim();
    const description = row[2].trim();
    const creditStr = row[3].trim();
    const debitStr = row[4].trim();

    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) continue;

    const rawAmount = creditStr || debitStr;
    if (!rawAmount) continue;
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    transactions.push({
      date: parseDate(dateStr),
      description,
      amount,
      category: "",
    });
  }

  return transactions;
}
