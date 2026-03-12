import { parsePostfinance } from "./postfinance";
import { parsePostfinanceCC } from "./postfinance-cc";
import { parseHandelsbanken } from "./handelsbanken";
import type { ParsedTransaction } from "./types";

export type BankType =
  | "postfinance"
  | "postfinance-cc"
  | "handelsbanken"
  | "unknown";

export function detectBankType(filename: string): BankType {
  if (filename.startsWith("export_transactions_")) return "postfinance";
  if (filename.startsWith("export_credit_cards_overview_")) return "postfinance-cc";
  if (filename.toLowerCase().startsWith("handelsbanken") && filename.endsWith(".xlsx"))
    return "handelsbanken";
  return "unknown";
}

export const BANK_LABELS: Record<BankType, string> = {
  "postfinance":    "PostFinance Account",
  "postfinance-cc": "PostFinance Credit Card",
  "handelsbanken":  "Handelsbanken",
  "unknown":        "Unknown format",
};

export async function parseFile(
  filename: string,
  buffer: Buffer
): Promise<ParsedTransaction[]> {
  const type = detectBankType(filename);
  const text = () => buffer.toString("utf-8");

  switch (type) {
    case "postfinance":    return parsePostfinance(text());
    case "postfinance-cc": return parsePostfinanceCC(text());
    case "handelsbanken":  return parseHandelsbanken(buffer);
    default:
      throw new Error(`Unrecognised file format: "${filename}". Expected a PostFinance or Handelsbanken export.`);
  }
}

export type { ParsedTransaction };
