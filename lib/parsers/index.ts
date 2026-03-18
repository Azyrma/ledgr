import { parsePostfinance } from "./postfinance";
import { parsePostfinanceCC } from "./postfinance-cc";
import { parseHandelsbanken } from "./handelsbanken";
import { parseMoneydance } from "./moneydance";
import { parseAvanza } from "./avanza";
import type { ParsedTransaction } from "./types";

export type BankType =
  | "postfinance"
  | "postfinance-cc"
  | "handelsbanken"
  | "moneydance"
  | "avanza"
  | "unknown";

export function detectBankType(filename: string, content?: string): BankType {
  if (filename.startsWith("export_transactions_")) return "postfinance";
  if (filename.startsWith("export_credit_cards_overview_")) return "postfinance-cc";
  if (filename.toLowerCase().startsWith("handelsbanken") && filename.endsWith(".xlsx"))
    return "handelsbanken";
  if (filename.toLowerCase().startsWith("transaktioner_")) return "avanza";

  if (content !== undefined) {
    const lines = content.split(/\r?\n/);
    if (lines[0]?.trim() === "Transactions" && lines[3]?.startsWith("Account,Date,Cheque#"))
      return "moneydance";
    if (lines[0]?.startsWith("Datum;Konto;Typ av transaktion"))
      return "avanza";
  }

  return "unknown";
}

export const BANK_LABELS: Record<BankType, string> = {
  "postfinance":    "PostFinance Account",
  "postfinance-cc": "PostFinance Credit Card",
  "handelsbanken":  "Handelsbanken",
  "moneydance":     "Moneydance Export",
  "avanza":         "Avanza",
  "unknown":        "Unknown format",
};

export async function parseFile(
  filename: string,
  buffer: Buffer
): Promise<ParsedTransaction[]> {
  const sniff = buffer.subarray(0, 200).toString("utf-8");
  const type = detectBankType(filename, sniff);
  const text = () => buffer.toString("utf-8");

  switch (type) {
    case "postfinance":    return parsePostfinance(text());
    case "postfinance-cc": return parsePostfinanceCC(text());
    case "handelsbanken":  return parseHandelsbanken(buffer);
    case "moneydance":     return parseMoneydance(text());
    case "avanza":         return parseAvanza(text());
    default:
      throw new Error(`Unrecognised file format: "${filename}". Expected a PostFinance, Handelsbanken, Moneydance, or Avanza export.`);
  }
}

export type { ParsedTransaction };
