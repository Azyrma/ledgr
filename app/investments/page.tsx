"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";
import HoldingFormModal from "@/app/components/HoldingFormModal";
import type { Account, Holding } from "@/app/components/AccountCard";
import { formatCurrency } from "@/lib/utils";

export default function InvestmentsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading]   = useState(true);
  const [formTarget, setFormTarget] = useState<{ accountId: number; holding?: Holding } | null>(null);
  const [deleting, setDeleting]     = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    const [accRes, holdRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/holdings"),
    ]);
    const accs: Account[] = await accRes.json();
    setAccounts(accs.filter((a) => a.type === "investment"));
    setHoldings(await holdRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch(`/api/holdings?id=${id}`, { method: "DELETE" });
    setDeleting(null);
    fetchAll();
  }

  async function handleRefreshPrices(accountId: number) {
    setRefreshing(accountId);
    try {
      await fetch("/api/holdings/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });
      fetchAll();
    } finally {
      setRefreshing(null);
    }
  }

  // CHF conversion uses the parent account's exchange_rate (known approximation
  // when a holding's currency differs from the account's — see TODO.md).
  const totalChf = accounts.reduce((sum, a) => {
    const accHoldings = holdings.filter((h) => h.account_id === a.id);
    return sum + accHoldings.reduce((s, h) => s + (h.market_value ?? h.total_value), 0) * a.exchange_rate;
  }, 0);
  const costChf = accounts.reduce((sum, a) => {
    const accHoldings = holdings.filter((h) => h.account_id === a.id);
    return sum + accHoldings.reduce((s, h) => s + h.total_value, 0) * a.exchange_rate;
  }, 0);
  const hasAnyMarket = holdings.some((h) => h.market_value != null);
  const gainChf = totalChf - costChf;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={<SplitTitle left="Invest" right="ments" />} />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <p className="text-sm font-medium text-base-content/60">No investment accounts yet</p>
            <p className="text-xs text-base-content/40">Add an account of type &quot;Investment&quot; on the Accounts page</p>
          </div>
        ) : (
          <>
            {/* Portfolio summary */}
            <div className="v2-card v2-card-pad">
              <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Total portfolio value
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <div className="display-serif num" style={{ fontSize: 40, lineHeight: 1 }}>
                  {formatCurrency(totalChf)}
                </div>
                {hasAnyMarket && costChf > 0 && (
                  <div
                    className="num"
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                      borderRadius: 100, fontSize: 13, fontWeight: 700,
                      background: gainChf >= 0 ? "var(--pos-soft)" : "var(--surface-2)",
                      color: gainChf >= 0 ? "var(--pos)" : "var(--neg)",
                    }}
                  >
                    {gainChf >= 0 ? "+" : ""}{formatCurrency(gainChf)}
                    {" "}({costChf > 0 ? ((gainChf / costChf) * 100).toFixed(1) : "0.0"}%)
                  </div>
                )}
              </div>
            </div>

            {/* One card per investment account */}
            {accounts.map((account) => {
              const accHoldings = holdings.filter((h) => h.account_id === account.id);
              const hasMarketPrices = accHoldings.some((h) => h.market_value != null);
              const hasIsins = accHoldings.some((h) => h.isin);
              const totalMarketValue = accHoldings.reduce((s, h) => s + (h.market_value ?? h.total_value), 0);
              const totalCostBasis   = accHoldings.reduce((s, h) => s + h.total_value, 0);

              return (
                <div key={account.id} className="v2-card v2-card-pad">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: account.color, display: "inline-block" }} />
                      <span className="display-serif" style={{ fontSize: 17 }}>{account.name}</span>
                      <span className="chip" style={{ fontSize: 12 }}>
                        {accHoldings.length} position{accHoldings.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span className="num" style={{ fontSize: 14, fontWeight: 600 }}>
                        {formatCurrency(totalMarketValue, account.currency)}
                      </span>
                      {hasMarketPrices && totalCostBasis > 0 && (
                        <span
                          className="num"
                          style={{ fontSize: 12.5, fontWeight: 600, color: totalMarketValue >= totalCostBasis ? "var(--pos)" : "var(--neg)" }}
                        >
                          {totalMarketValue >= totalCostBasis ? "+" : ""}
                          {formatCurrency(totalMarketValue - totalCostBasis, account.currency)}
                        </span>
                      )}
                      <button
                        onClick={() => setFormTarget({ accountId: account.id })}
                        className="btn btn-primary btn-xs"
                      >
                        Add holding
                      </button>
                      {hasIsins && (
                        <button
                          onClick={() => handleRefreshPrices(account.id)}
                          disabled={refreshing === account.id}
                          className="btn btn-outline btn-xs"
                        >
                          {refreshing === account.id ? "Fetching…" : "Refresh prices"}
                        </button>
                      )}
                    </div>
                  </div>

                  {accHoldings.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13 }}>No holdings yet</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
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
                          {accHoldings.map((h) => {
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
                                    <button
                                      onClick={() => setFormTarget({ accountId: account.id, holding: h })}
                                      className="btn btn-ghost btn-xs"
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
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {formTarget && (
        <HoldingFormModal
          accountId={formTarget.accountId}
          initial={formTarget.holding}
          onClose={() => setFormTarget(null)}
          onSaved={fetchAll}
        />
      )}
    </div>
  );
}
