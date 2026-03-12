"use client";

import { useEffect, useState } from "react";

type Account = { id: number; name: string };

type Props = {
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

export default function AddTransactionModal({ onClose, onSaved }: Props) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    accountId: "",
    category: "",
    amount: "",
  });

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data) => {
        setAccounts(data);
        if (data.length === 1) setForm((f) => ({ ...f, accountId: String(data[0].id) }));
      })
      .catch(() => {});
  }, []);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.date || !form.description || !form.accountId || !form.amount) {
      setError("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          description: form.description,
          accountId: Number(form.accountId),
          category: form.category,
          amount: parseFloat(form.amount),
        }),
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
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Add Transaction</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Amount (CHF)" required>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Description" required>
            <input
              type="text"
              placeholder="e.g. Migros grocery shopping"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Account" required>
            {accounts.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                No accounts found. Add one on the{" "}
                <a href="/accounts" className="underline hover:text-zinc-700 dark:hover:text-zinc-200">
                  Accounts page
                </a>{" "}
                first.
              </p>
            ) : (
              <select
                value={form.accountId}
                onChange={(e) => set("accountId", e.target.value)}
                className={inputClass}
              >
                <option value="">Select an account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Category">
            <input
              type="text"
              placeholder="e.g. Personal:Food"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Saving…" : "Add transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
