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

  const priceTimestamps = holdings.filter((h) => h.price_updated_at).map((h) => h.price_updated_at!);
  const lastUpdated = priceTimestamps.length > 0
    ? new Date(priceTimestamps.sort()[0]).toLocaleString("en-CH", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-fit max-w-[80vw] max-h-[80vh] flex flex-col">
        {/* Header */}
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">{account.name} — Holdings</h3>
        {holdings.length > 0 && (
          <div className="mt-0.5 flex items-center gap-3">
            <span className="text-sm text-base-content/60">
              {holdings.length} holding{holdings.length !== 1 ? "s" : ""}
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(totalMarketValue, account.currency)}
            </span>
            {hasMarketPrices && totalCostBasis > 0 && (
              <span className={`text-sm font-medium ${totalMarketValue >= totalCostBasis ? "text-success" : "text-error"}`}>
                {totalMarketValue >= totalCostBasis ? "+" : ""}{formatCurrency(totalMarketValue - totalCostBasis, account.currency)}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="mt-4 min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : holdings.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-base-content/60">No holdings yet</p>
              <p className="text-xs text-base-content/40">Add stocks or funds you own in this account</p>
            </div>
          ) : (
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Name</th>
                  <th className="text-right">Shares</th>
                  <th className="text-right">Avg Cost</th>
                  {hasMarketPrices && <th className="text-right">Price</th>}
                  <th className="text-right">Value</th>
                  {hasMarketPrices && <th className="text-right">Gain/Loss</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const displayValue = h.market_value ?? h.total_value;
                  const gainLoss = h.market_value != null ? h.market_value - h.total_value : null;
                  const gainPct = gainLoss != null && h.total_value > 0 ? (gainLoss / h.total_value) * 100 : null;

                  return (
                    <tr key={h.id} className="hover">
                      <td>
                        <p className="font-semibold">{h.name}</p>
                        {h.isin && <p className="text-xs text-base-content/40">{h.isin}</p>}
                      </td>
                      <td className="text-right font-mono">
                        {h.shares % 1 === 0 ? h.shares : h.shares.toFixed(4)}
                      </td>
                      <td className="text-right font-mono">
                        {formatCurrency(h.avg_cost_per_share, h.currency)}
                      </td>
                      {hasMarketPrices && (
                        <td className="text-right font-mono">
                          {h.current_price != null ? formatCurrency(h.current_price, h.currency) : "—"}
                        </td>
                      )}
                      <td className="text-right font-mono">
                        {h.market_value != null && (
                          <p className="text-xs text-base-content/40">{formatCurrency(h.total_value, h.currency)}</p>
                        )}
                        <p className="font-medium">{formatCurrency(displayValue, h.currency)}</p>
                      </td>
                      {hasMarketPrices && (
                        <td className="text-right font-mono">
                          {gainLoss != null ? (
                            <span className={gainLoss >= 0 ? "text-success" : "text-error"}>
                              {gainLoss >= 0 ? "+" : ""}{formatCurrency(gainLoss, h.currency)}
                              {gainPct != null && (
                                <span className="ml-1 text-xs">({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%)</span>
                              )}
                            </span>
                          ) : "—"}
                        </td>
                      )}
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditTarget(h)} className="btn btn-ghost btn-xs" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(h.id)}
                            disabled={deleting === h.id}
                            className="btn btn-ghost btn-xs text-error"
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
        <div className="modal-action justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAdd(true)} className="btn btn-primary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add holding
            </button>
            {hasIsins && (
              <button onClick={handleRefreshPrices} disabled={refreshing} className="btn btn-outline btn-sm">
                {refreshing ? <span className="loading loading-spinner loading-xs"></span> : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                )}
                {refreshing ? "Fetching..." : "Refresh prices"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-base-content/40">Prices from {lastUpdated}</span>
            )}
            <button type="button" onClick={onClose} className="btn btn-ghost">Close</button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>

      {showAdd && (
        <HoldingFormModal accountId={account.id} onClose={() => setShowAdd(false)} onSaved={handleSaved} />
      )}
      {editTarget && (
        <HoldingFormModal accountId={account.id} initial={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />
      )}
    </dialog>
  );
}
