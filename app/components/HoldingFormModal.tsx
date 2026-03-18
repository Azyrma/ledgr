"use client";

import { useState } from "react";
import { CURRENCIES } from "./AccountModal";
import type { Holding } from "./AccountCard";

type Props = {
  accountId: number;
  initial?: Holding;
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";

export default function HoldingFormModal({ accountId, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial?.id;

  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [shares, setShares] = useState(initial?.shares ?? 0);
  const [avgCost, setAvgCost] = useState(initial?.avg_cost_per_share ?? 0);
  const [currency, setCurrency] = useState(initial?.currency ?? "USD");
  const [isin, setIsin] = useState(initial?.isin ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!ticker.trim() || !name.trim()) { setError("Ticker and name are required."); return; }
    if (shares <= 0) { setError("Shares must be greater than 0."); return; }

    setSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { id: initial!.id, ticker, name, shares, avg_cost_per_share: avgCost, currency, isin }
        : { account_id: accountId, ticker, name, shares, avg_cost_per_share: avgCost, currency, isin };

      const res = await fetch("/api/holdings", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {isEdit ? "Edit Holding" : "Add Holding"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Ticker<span className="ml-0.5 text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. AAPL"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className={inputClass}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Name<span className="ml-0.5 text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Apple Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ISIN <span className="text-xs font-normal text-zinc-400">(for live prices)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. SE0011527613"
              value={isin}
              onChange={(e) => setIsin(e.target.value.toUpperCase())}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Shares<span className="ml-0.5 text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0"
                value={shares || ""}
                onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Avg cost/share<span className="ml-0.5 text-red-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={avgCost || ""}
                onChange={(e) => setAvgCost(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add holding"}
          </button>
        </div>
      </div>
    </div>
  );
}
