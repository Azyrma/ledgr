import type { ParsedTransaction } from "./types";

function parseDate(str: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const [d, m, y] = str.split(".");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parsePostfinanceCC(text: string): ParsedTransaction[] {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(";").map((cell) => cell.trim().replace(/^"|"$/g, "")));

  const headerIdx = rows.findIndex((r) => r[0]?.trim() === "Invoicing period");
  if (headerIdx === -1) throw new Error("Could not find header row in PostFinance CC file.");

  const transactions: ParsedTransaction[] = [];

  for (const row of rows.slice(headerIdx + 1)) {
    if (!row[0]?.trim() || row.length < 6) continue;

    const purchaseDateStr = row[2]?.trim();
    const description = row[3]?.trim().replace(/^"|"$/g, "") ?? "";
    const creditStr = row[4]?.trim();
    const debitStr = row[5]?.trim();

    if (!purchaseDateStr || !/^\d{2}\.\d{2}\.\d{4}$/.test(purchaseDateStr)) continue;

    const rawAmount = creditStr || debitStr;
    if (!rawAmount) continue;
    const amount = parseFloat(rawAmount);
    if (isNaN(amount)) continue;

    transactions.push({
      date: parseDate(purchaseDateStr),
      description,
      amount,
      category: "",
    });
  }

  return transactions;
}
