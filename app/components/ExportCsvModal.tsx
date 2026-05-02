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
};

type Props = {
  transactions: Transaction[];
  onClose: () => void;
  /** When provided, amounts are exported in this currency (no CHF conversion). Use for single-account exports. */
  currency?: string;
};

export default function ExportCsvModal({ transactions, onClose, currency }: Props) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const displayCurrency = currency ?? "CHF";

  const rows: Array<{
    date: string;
    description: string;
    account: string;
    category: string;
    amount: number;
    runningTotal: number;
  }> = [];

  let runningTotal = 0;
  for (const t of sorted) {
    const amount = currency ? t.amount : t.amount * t.exchange_rate;
    runningTotal += amount;
    rows.push({
      date: t.date,
      description: t.description,
      account: t.account_name,
      category: t.category || "",
      amount,
      runningTotal: runningTotal,
    });
  }

  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function generateCsv(): string {
    const headers = ["Date", "Description", "Account", "Category", `Amount (${displayCurrency})`, "Running Total"];
    const csvRows: string[] = [headers.map(quoteField).join(",")];

    for (const row of rows) {
      csvRows.push([
        quoteField(row.date),
        quoteField(row.description),
        quoteField(row.account),
        quoteField(row.category),
        row.amount.toFixed(2),
        row.runningTotal.toFixed(2),
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
    const csv = generateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    const filename = `transactions-export-${dateStr}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-4xl max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">Export Transactions</h3>

        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          <table className="table table-zebra table-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Account</th>
                <th>Category</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Running Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td>{formatDate(row.date)}</td>
                  <td>{row.description}</td>
                  <td>{row.account}</td>
                  <td>{row.category}</td>
                  <td className="text-right font-mono">{formatCurrency(row.amount, displayCurrency)}</td>
                  <td className="text-right font-mono">{formatCurrency(row.runningTotal, displayCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
