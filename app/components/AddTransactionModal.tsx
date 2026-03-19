"use client";

import { useEffect, useState } from "react";

type Account = { id: number; name: string };

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

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
    <dialog className="modal modal-open">
      <div className="modal-box">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">Add Transaction</h3>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <fieldset className="fieldset">
              <legend className="fieldset-legend">Date *</legend>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="input input-bordered w-full"
              />
            </fieldset>

            <fieldset className="fieldset">
              <legend className="fieldset-legend">Amount (CHF) *</legend>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="input input-bordered w-full"
              />
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Description *</legend>
            <input
              type="text"
              placeholder="e.g. Migros grocery shopping"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Account *</legend>
            {accounts.length === 0 ? (
              <p className="text-sm text-base-content/50">
                No accounts found. Add one on the{" "}
                <a href="/accounts" className="link">Accounts page</a> first.
              </p>
            ) : (
              <select
                value={form.accountId}
                onChange={(e) => set("accountId", e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">Select an account…</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Category</legend>
            <input
              type="text"
              placeholder="e.g. Personal:Food"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>

          {error && <p className="text-sm text-error">{error}</p>}
        </form>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
            {saving ? <span className="loading loading-spinner loading-sm"></span> : null}
            {saving ? "Saving…" : "Add transaction"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
