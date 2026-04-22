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

export default function HoldingFormModal({ accountId, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial?.id;

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
    if (!name.trim()) { setError("Name is required."); return; }
    if (shares <= 0) { setError("Shares must be greater than 0."); return; }

    setSaving(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { id: initial!.id, name, shares, avg_cost_per_share: avgCost, currency, isin }
        : { account_id: accountId, name, shares, avg_cost_per_share: avgCost, currency, isin };

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
    <dialog className="modal modal-open" style={{ zIndex: 60 }}>
      <div className="modal-box max-w-sm">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">{isEdit ? "Edit Holding" : "Add Holding"}</h3>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="fieldset col-span-2">
              <legend className="fieldset-legend">Name *</legend>
              <input
                type="text"
                placeholder="e.g. Vanguard FTSE All-World"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input input-bordered w-full"
                autoFocus
              />
            </fieldset>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Currency</legend>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="select select-bordered w-full">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">ISIN <span className="text-xs font-normal text-base-content/40">(for live prices)</span></legend>
            <input
              type="text"
              placeholder="e.g. SE0011527613"
              value={isin}
              onChange={(e) => setIsin(e.target.value.toUpperCase())}
              className="input input-bordered w-full"
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Shares *</legend>
              <input
                type="number"
                step="0.0001"
                min="0"
                placeholder="0"
                value={shares || ""}
                onChange={(e) => setShares(parseFloat(e.target.value) || 0)}
                className="input input-bordered w-full"
              />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Avg cost/share *</legend>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={avgCost || ""}
                onChange={(e) => setAvgCost(parseFloat(e.target.value) || 0)}
                className="input input-bordered w-full"
              />
            </fieldset>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}
        </form>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
            {saving ? <span className="loading loading-spinner loading-sm"></span> : null}
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add holding"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
