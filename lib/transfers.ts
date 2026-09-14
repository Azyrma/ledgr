import type Database from "better-sqlite3";

type TxRow = {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  reimbursable: number;
  ticker: string;
  shares: number;
  linked_transaction_id: number | null;
};

// When a transaction's category is set to "Transfer: <Account>", mirror it into
// that account: create a linked transaction with the same data, an inverted
// amount, and a category that points back to the source account.
export function syncTransfer(db: Database.Database, txId: number): boolean {
  const tx = db.prepare("SELECT * FROM transactions WHERE id = ?").get(txId) as TxRow | undefined;
  if (!tx) return false;

  const match = /^Transfer:\s*(.+)$/.exec(tx.category);
  if (!match) return false;
  if (tx.linked_transaction_id !== null) return false; // already mirrored

  const targetName = match[1].trim();
  const target = db.prepare("SELECT id, name, exchange_rate FROM accounts WHERE name = ?")
    .get(targetName) as { id: number; name: string; exchange_rate: number } | undefined;
  if (!target || target.id === tx.account_id) return false;

  const source = db.prepare("SELECT name, exchange_rate FROM accounts WHERE id = ?")
    .get(tx.account_id) as { name: string; exchange_rate: number } | undefined;
  const mirrorCategory = source ? `Transfer: ${source.name}` : "";

  // Amounts are stored in their account's currency; exchange_rate is CHF per unit.
  // Cross-currency transfers convert via CHF. ponytail: uses today's rate, not the
  // rate on the transfer date — off by the bank's spread. Store the real received
  // amount if that matters.
  const rate = source && target.exchange_rate
    ? source.exchange_rate / target.exchange_rate
    : 1;
  const mirrorAmount = Math.round(-tx.amount * rate * 100) / 100;

  db.transaction(() => {
    const result = db.prepare(
      `INSERT INTO transactions
         (account_id, date, description, amount, category, reimbursable, ticker, shares, linked_transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      target.id, tx.date, tx.description, mirrorAmount, mirrorCategory,
      tx.reimbursable, tx.ticker, tx.shares, tx.id
    );
    db.prepare("UPDATE transactions SET linked_transaction_id = ? WHERE id = ?")
      .run(result.lastInsertRowid, tx.id);
  })();

  return true;
}
