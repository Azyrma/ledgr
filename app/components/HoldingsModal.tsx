"use client";

import { useCallback, useEffect, useState } from "react";
import type { Account, Holding } from "./AccountCard";
import HoldingFormModal from "./HoldingFormModal";
import { formatCurrency } from "@/lib/utils";

type Props = {
  account: Account;
  onClose: () => void;
  onChanged: () => void;
};

export default function HoldingsModal({ account, onClose, onChanged }: Props) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<Holding | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/holdings?account_id=${account.id}`);
    setHoldings(await res.json());
    setLoading(false);
  }, [account.id]);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch(`/api/holdings?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchHoldings();
    onChanged();
  }

  function handleSaved() {
    fetchHoldings();
    onChanged();
  }

  async function handleRefreshPrices() {
    setRefreshing(true);
    try {
      await fetch("/api/holdings/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: account.id }),
      });
      fetchHoldings();
      onChanged();
    } finally {
      setRefreshing(false);
    }
  }

  const hasMarketPrices = holdings.some((h) => h.market_value != null);
  const totalMarketValue = holdings.reduce((sum, h) => sum + (h.market_value ?? h.total_value), 0);
  const totalCostBasis = holdings.reduce((sum, h) => sum + h.total_value, 0);
  const hasIsins = holdings.some((h) => h.isin);

  // Find the oldest price update time for display
  const priceTimestamps = holdings.filter((h) => h.price_updated_at).map((h) => h.price_updated_at!);
  const lastUpdated = priceTimestamps.length > 0
    ? new Date(priceTimestamps.sort()[0]).toLocaleString("en-CH", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-3xl max-h-[80vh] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {account.name} — Holdings
            </h2>
            {holdings.length > 0 && (
              <div className="mt-0.5 flex items-center gap-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {formatCurrency(totalMarketValue, account.currency)}
                </span>
                {hasMarketPrices && totalCostBasis > 0 && (
                  <span className={`text-sm font-medium ${totalMarketValue >= totalCostBasis ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                    {totalMarketValue >= totalCostBasis ? "+" : ""}{formatCurrency(totalMarketValue - totalCostBasis, account.currency)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="h-6 w-6 animate-spin text-zinc-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No holdings yet</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">Add stocks or funds you own in this account</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="sticky top-0 bg-white px-6 py-3 text-left font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Name</th>
                  <th className="sticky top-0 bg-white px-4 py-3 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Shares</th>
                  <th className="sticky top-0 bg-white px-4 py-3 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Avg Cost</th>
                  {hasMarketPrices && (
                    <th className="sticky top-0 bg-white px-4 py-3 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Price</th>
                  )}
                  <th className="sticky top-0 bg-white px-4 py-3 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Value</th>
                  {hasMarketPrices && (
                    <th className="sticky top-0 bg-white px-4 py-3 text-right font-semibold text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50">Gain/Loss</th>
                  )}
                  <th className="sticky top-0 bg-white px-6 py-3 dark:bg-zinc-900"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const displayValue = h.market_value ?? h.total_value;
                  const gainLoss = h.market_value != null ? h.market_value - h.total_value : null;
                  const gainPct = gainLoss != null && h.total_value > 0 ? (gainLoss / h.total_value) * 100 : null;

                  return (
                    <tr key={h.id} className="border-b border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-50">{h.name}</p>
                        {h.isin && <p className="text-xs text-zinc-400 dark:text-zinc-500">{h.isin}</p>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        {h.shares % 1 === 0 ? h.shares : h.shares.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(h.avg_cost_per_share, h.currency)}
                      </td>
                      {hasMarketPrices && (
                        <td className="px-4 py-3 text-right font-mono text-zinc-700 dark:text-zinc-300">
                          {h.current_price != null ? formatCurrency(h.current_price, h.currency) : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-mono">
                        {h.market_value != null && (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatCurrency(h.total_value, h.currency)}</p>
                        )}
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(displayValue, h.currency)}</p>
                      </td>
                      {hasMarketPrices && (
                        <td className="px-4 py-3 text-right font-mono">
                          {gainLoss != null ? (
                            <span className={gainLoss >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
                              {gainLoss >= 0 ? "+" : ""}{formatCurrency(gainLoss, h.currency)}
                              {gainPct != null && (
                                <span className="ml-1 text-xs">({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%)</span>
                              )}
                            </span>
                          ) : "—"}
                        </td>
                      )}
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditTarget(h)}
                            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            disabled={deleting === h.id}
                            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add holding
            </button>
            {hasIsins && (
              <button
                onClick={handleRefreshPrices}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                {refreshing ? "Fetching..." : "Refresh prices"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Prices from {lastUpdated}
              </span>
            )}
            <button type="button" onClick={onClose} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showAdd && (
        <HoldingFormModal
          accountId={account.id}
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
      {editTarget && (
        <HoldingFormModal
          accountId={account.id}
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
