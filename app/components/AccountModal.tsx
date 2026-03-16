"use client";

import { useState } from "react";

export const ACCOUNT_COLORS = [
  { label: "Indigo",  value: "#6366f1" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Red",     value: "#ef4444" },
  { label: "Blue",    value: "#3b82f6" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Orange",  value: "#f97316" },
  { label: "Purple",  value: "#8b5cf6" },
  { label: "Lime",    value: "#84cc16" },
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

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}{required && <span className="ml-0.5 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AccountModal({ initial, onClose, onSaved }: Props) {
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<AccountFormData>({
    name:            initial?.name            ?? "",
    type:            initial?.type            ?? "checking",
    currency:        initial?.currency        ?? "CHF",
    color:           initial?.color           ?? "#6366f1",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-md flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {isEdit ? "Edit Account" : "Add Account"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <Field label="Account name" required>
            <input
              type="text"
              placeholder="e.g. PostFinance Checking"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputClass}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Currency">
              <select value={form.currency} onChange={(e) => set("currency", e.target.value)} className={inputClass}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {form.currency !== "CHF" && (
            <Field label="Exchange rate to CHF">
              <input
                type="number"
                step="0.00001"
                min="0"
                placeholder="e.g. 0.08750"
                value={form.exchange_rate}
                onChange={(e) => set("exchange_rate", parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </Field>
          )}

          <Field label="Initial balance">
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={form.initial_balance}
              onChange={(e) => set("initial_balance", parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </Field>

          <Field label="Color">
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
          </Field>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add account"}
          </button>
        </div>
      </div>
    </div>
  );
}
