"use client";

import { useState } from "react";

export const ACCOUNT_COLORS = [
  { label: "PostFinance",   value: "#FFCC00" },
  { label: "ZKB",           value: "#054696" },
  { label: "Wise",          value: "#9FE870" },
  { label: "Handelsbanken", value: "#015FA5" },
  { label: "Swissquote",    value: "#FA5B35" },
  { label: "Schwab",        value: "#009CDB" },
  { label: "Avanza",        value: "#00C281" },
];

export const ACCOUNT_TYPES = [
  { value: "checking",    label: "Checking" },
  { value: "savings",     label: "Savings" },
  { value: "credit_card", label: "Credit Card" },
  { value: "investment",  label: "Investment" },
];

export const CURRENCIES = ["CHF", "EUR", "USD", "SEK", "GBP"];

export type AccountFormData = {
  name: string;
  type: string;
  currency: string;
  color: string;
  initial_balance: number;
  exchange_rate: number;
};

type Props = {
  initial?: AccountFormData & { id?: number };
  onClose: () => void;
  onSaved: () => void;
};

export default function AccountModal({ initial, onClose, onSaved }: Props) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<AccountFormData>({
    name:            initial?.name            ?? "",
    type:            initial?.type            ?? "checking",
    currency:        initial?.currency        ?? "CHF",
    color:           initial?.color           ?? "#FFCC00",
    initial_balance: initial?.initial_balance ?? 0,
    exchange_rate:   initial?.exchange_rate   ?? 1.0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function set<K extends keyof AccountFormData>(key: K, value: AccountFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    try {
      const url    = isEdit ? `/api/accounts/${initial!.id}` : "/api/accounts";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">{isEdit ? "Edit Account" : "Add Account"}</h3>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Account name *</legend>
            <input
              type="text"
              placeholder="e.g. PostFinance Checking"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="input input-bordered w-full"
              autoFocus
            />
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Type *</legend>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className="select select-bordered w-full">
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Currency</legend>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className="select select-bordered w-full">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </fieldset>
          </div>

          {form.currency !== "CHF" && (
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Exchange rate to CHF</legend>
              <input
                type="number"
                step="0.00001"
                min="0"
                placeholder="e.g. 0.08750"
                value={form.exchange_rate}
                onChange={(e) => set("exchange_rate", parseFloat(e.target.value) || 0)}
                className="input input-bordered w-full"
              />
            </fieldset>
          )}

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Initial balance</legend>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) => set("initial_balance", parseFloat(e.target.value) || 0)}
              className="input input-bordered w-full"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Color</legend>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => set("color", c.value)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: c.value, outline: form.color === c.value ? `3px solid ${c.value}` : "none", outlineOffset: "2px" }}
                />
              ))}
            </div>
          </fieldset>

          {error && <p className="text-sm text-error">{error}</p>}
        </form>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
            {saving ? <span className="loading loading-spinner loading-sm"></span> : null}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add account"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
