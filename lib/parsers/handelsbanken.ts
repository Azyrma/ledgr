import * as XLSX from "xlsx";
import { lookupCategory } from "../categories";
import type { ParsedTransaction } from "./types";

export function parseHandelsbanken(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  const headerIdx = allRows.findIndex(
    (row) => row && String(row[0]).trim().toLowerCase() === "ledger date"
  );
  if (headerIdx === -1) throw new Error("Could not find header row in Handelsbanken file.");

  const transactions: ParsedTransaction[] = [];

  for (const row of allRows.slice(headerIdx + 1) as string[][]) {
    if (!row || row[0] == null) continue;

    const transactionDateStr = String(row[1] ?? "").trim();
    const description = String(row[2] ?? "").trim();
    const amountRaw = row[3];

    if (!transactionDateStr || !description) continue;

    // Date may be YYYY-MM-DD string or a formatted date string
    let isoDate: string;
    const match = transactionDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      isoDate = `${match[1]}-${match[2]}-${match[3]}`;
    } else {
      continue;
    }

    const amount = parseFloat(String(amountRaw).replace(",", "."));
    if (isNaN(amount)) continue;

    transactions.push({
      date: isoDate,
      description,
      amount,
      category: lookupCategory(description),
    });
  }

  return transactions;
}
