"use client";

import { formatCurrency } from "@/lib/utils";

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  reimbursable: number;
  needs_review: number;
  account_id: number;
  account_name: string;
  account_color: string;
  account_currency: string;
  exchange_rate: number;
  linked_transaction_id: number | null;
  balance?: number | null;
};

type Props = {
  transactions: Transaction[];
  onClose: () => void;
  /** When provided, amounts are exported in this currency (no CHF conversion). Use for single-account exports. */
  currency?: string;
};

export default function ExportCsvModal({ transactions, onClose, currency }: Props) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  // For single-account exports we show the account's true running balance
  // (initial balance + cumulative amount); otherwise a running total from 0.
  const useBalance = currency != null;
  const totalLabel = useBalance ? "Balance" : "Running Total";

  type Row = {
    date: string;
    description: string;
    account: string;
    category: string;
    amount: number;
    total: number;
  };

  // One row group per currency; a fixed `currency` prop (single-account export)
  // forces a single group. Amounts stay in their account's currency.
  const groups = new Map<string, Row[]>();
  const runningTotals = new Map<string, number>();
  for (const t of sorted) {
    const cur = currency ?? (t.account_currency || "CHF");
    const runningTotal = (runningTotals.get(cur) ?? 0) + t.amount;
    runningTotals.set(cur, runningTotal);
    (groups.get(cur) ?? groups.set(cur, []).get(cur)!).push({
      date: t.date,
      description: t.description,
      account: t.account_name,
      category: t.category || "",
      amount: t.amount,
      total: useBalance ? (t.balance ?? runningTotal) : runningTotal,
    });
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function generateCsv(cur: string, rows: Row[]): string {
    const headers = ["Date", "Description", "Account", "Category", `Amount (${cur})`, totalLabel];
    const csvRows: string[] = [headers.map(quoteField).join(",")];

    for (const row of rows) {
      csvRows.push([
        quoteField(row.date),
        quoteField(row.description),
        quoteField(row.account),
        quoteField(row.category),
        row.amount.toFixed(2),
        row.total.toFixed(2),
      ].join(","));
    }

    return csvRows.join("\n");
  }

  function quoteField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  function handleDownload() {
    const dateStr = new Date().toISOString().split("T")[0];
    for (const [cur, rows] of groups) {
      const blob = new Blob([generateCsv(cur, rows)], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const suffix = groups.size > 1 ? `-${cur}` : "";
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", `transactions-export-${dateStr}${suffix}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">Export Transactions</h3>

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {[...groups].map(([cur, rows]) => (
            <div key={cur}>
              {groups.size > 1 && (
                <h4 className="mt-4 mb-1 text-sm font-semibold text-base-content/60">{cur}</h4>
              )}
              <table className="table table-zebra table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Account</th>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">{totalLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.description}</td>
                      <td>{row.account}</td>
                      <td>{row.category}</td>
                      <td className="text-right font-mono">{formatCurrency(row.amount, cur)}</td>
                      <td className="text-right font-mono">{formatCurrency(row.total, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
          <button onClick={handleDownload} className="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
