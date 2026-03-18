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
};

export default function ExportCsvModal({ transactions, onClose }: Props) {
  // Sort transactions by date ascending (oldest first)
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  // Build rows with running total
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
    const amountChf = t.amount * t.exchange_rate;
    runningTotal += amountChf;
    rows.push({
      date: t.date,
      description: t.description,
      account: t.account_name,
      category: t.category || "",
      amount: amountChf,
      runningTotal: runningTotal,
    });
  }

  // Helper function to format dates for display
  function formatDate(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  // Generate CSV content
  function generateCsv(): string {
    const headers = ["Date", "Description", "Account", "Category", "Amount (CHF)", "Running Total"];
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

  // Quote fields that contain commas, quotes, or newlines
  function quoteField(field: string): string {
    if (field.includes(",") || field.includes('"') || field.includes("\n")) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  // Download CSV
  function handleDownload() {
    const csv = generateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    // Generate filename with today's date
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-4xl max-h-[80vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Export Transactions</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Preview Table */}
        <div className="min-h-0 flex-1 overflow-auto p-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="sticky top-0 bg-white px-4 py-2 text-left font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Date</th>
                  <th className="sticky top-0 bg-white px-4 py-2 text-left font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Description</th>
                  <th className="sticky top-0 bg-white px-4 py-2 text-left font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Account</th>
                  <th className="sticky top-0 bg-white px-4 py-2 text-left font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Category</th>
                  <th className="sticky top-0 bg-white px-4 py-2 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Amount</th>
                  <th className="sticky top-0 bg-white px-4 py-2 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Running Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-zinc-100 transition-colors dark:border-zinc-800 ${
                      idx % 2 === 0
                        ? "bg-white dark:bg-zinc-900"
                        : "bg-zinc-50 dark:bg-zinc-800/40"
                    } hover:bg-zinc-100 dark:hover:bg-zinc-800`}
                  >
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{formatDate(row.date)}</td>
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{row.description}</td>
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{row.account}</td>
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">{row.category}</td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">
                      {formatCurrency(row.runningTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
