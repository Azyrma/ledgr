"use client";

import { useState } from "react";
import { CURRENCIES } from "./AccountModal";
import type { Account, Holding } from "./AccountCard";
import { formatCurrency } from "@/lib/utils";

export type InvestmentTx = {
  id: number;
  account_id: number;
  date: string;
  description: string;
  amount: number;
  ticker: string;
  shares: number;
};

type Props = {
  tx: InvestmentTx;
  account: Account;
  holdings: Holding[];
  onClose: () => void;
  onSaved: () => void;
};

export default function AssignHoldingModal({ tx, account, holdings, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<"buy" | "sell" | "dividend">(tx.amount < 0 ? "buy" : "sell");
  const [target, setTarget] = useState<string>(holdings[0] ? String(holdings[0].id) : "new");
  const [shares, setShares] = useState(0);
  const [price, setPrice] = useState("");
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(account.currency);
  const [isin, setIsin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const existing = target === "new" ? null : holdings.find((h) => String(h.id) === target) ?? null;
  const holdingCurrency = existing ? existing.currency : currency;
  const needsTicker = target === "new" || (existing != null && !existing.ticker);
  // Price defaults to amount / shares when the holding is in the account's currency
  const suggestedPrice = holdingCurrency === account.currency && shares > 0 ? Math.abs(tx.amount) / shares : null;
  const effectivePrice = price !== "" ? parseFloat(price) : suggestedPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (kind !== "dividend" && shares <= 0) { setError("Shares must be greater than 0."); return; }
    if (kind === "buy" && (effectivePrice == null || isNaN(effectivePrice))) { setError(`Price per share in ${holdingCurrency} is required.`); return; }
    if (needsTicker && !ticker.trim()) { setError("Ticker is required."); return; }
    if (target === "new" && !name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/holdings/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction_id: tx.id,
          kind,
          shares,
          price_per_share: kind === "buy" ? effectivePrice : null,
          ...(existing
            ? { holding_id: existing.id, ticker }
            : { new_holding: { ticker, name, currency, isin } }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to assign.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog className="modal modal-open" style={{ zIndex: 60 }}>
      <div className="modal-box max-w-sm">
        <h3 className="text-lg font-bold">Assign to holding</h3>
        <p className="mt-1 text-sm text-base-content/60">
          {tx.description} · {formatCurrency(tx.amount, account.currency)}
        </p>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="join w-full">
            {(["buy", "sell", "dividend"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`btn btn-sm join-item flex-1 ${kind === k ? "btn-primary" : "btn-outline"}`}
              >
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Holding</legend>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="select select-bordered w-full">
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>{h.ticker ? `${h.ticker} · ` : ""}{h.name}</option>
              ))}
              <option value="new">+ New holding</option>
            </select>
          </fieldset>

          {target === "new" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Ticker *</legend>
                  <input type="text" placeholder="e.g. VWRL" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="input input-bordered w-full" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Currency</legend>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="select select-bordered w-full">
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </fieldset>
              </div>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Name *</legend>
                <input type="text" placeholder="e.g. Vanguard FTSE All-World" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered w-full" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend">ISIN <span className="text-xs font-normal text-base-content/40">(for live prices)</span></legend>
                <input type="text" placeholder="e.g. IE00B3RBWM25" value={isin} onChange={(e) => setIsin(e.target.value.toUpperCase())} className="input input-bordered w-full" />
              </fieldset>
            </>
          )}

          {existing && !existing.ticker && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Ticker * <span className="text-xs font-normal text-base-content/40">(this holding has none yet)</span></legend>
              <input type="text" placeholder="e.g. VWRL" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} className="input input-bordered w-full" />
            </fieldset>
          )}

          {kind !== "dividend" && (
            <div className="grid grid-cols-2 gap-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend">Shares *</legend>
                <input
                  type="number" step="0.0001" min="0" placeholder="0"
                  value={shares || ""}
                  onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
                  className="input input-bordered w-full"
                  autoFocus
                />
              </fieldset>
              {kind === "buy" && (
                <fieldset className="fieldset">
                  <legend className="fieldset-legend">Price/share ({holdingCurrency}) *</legend>
                  <input
                    type="number" step="0.0001" min="0"
                    placeholder={suggestedPrice != null ? suggestedPrice.toFixed(4) : "0.00"}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input input-bordered w-full"
                  />
                </fieldset>
              )}
            </div>
          )}

          {error && <p className="text-sm text-error">{error}</p>}
        </form>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
            {saving ? <span className="loading loading-spinner loading-sm"></span> : null}
            {saving ? "Saving..." : "Assign"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
