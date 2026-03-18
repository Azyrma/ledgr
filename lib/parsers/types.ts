export type ParsedTransaction = {
  date: string;        // ISO: YYYY-MM-DD
  description: string;
  amount: number;
  category: string;
  ticker?: string;          // security identifier (for investment transactions)
  shares?: number;          // number of shares (positive = buy, negative = sell)
  holdingName?: string;     // display name for the holding
  holdingCurrency?: string; // currency of the instrument
  isin?: string;            // ISIN code for price lookups
};
