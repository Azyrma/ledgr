"use client";

import { useState } from "react";

export type RecurringItem = { id: number; title: string; pattern: string; frequency: string };

const FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"];

type Props = {
  /** Existing item to edit; omit to create. */
  initial?: RecurringItem;
  /** Prefill for a new item (from a suggestion). */
  prefill?: { title?: string; pattern?: string; frequency?: string };
  onClose: () => void;
  onSaved: () => void;
};

export default function RecurringModal({ initial, prefill, onClose, onSaved }: Props) {
  const [title, setTitle]         = useState(initial?.title ?? prefill?.title ?? "");
  const [pattern, setPattern]     = useState(initial?.pattern ?? prefill?.pattern ?? "");
  const [frequency, setFrequency] = useState(initial?.frequency ?? prefill?.frequency ?? "monthly");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSave() {
    if (!title.trim() || !pattern.trim()) return;
    setSaving(true);
    const res = await fetch(initial ? `/api/recurring/${initial.id}` : "/api/recurring", {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, pattern, frequency }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to save.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="text-lg font-bold">{initial ? "Edit recurring" : "Add recurring"}</h3>
        <p className="mt-1 text-sm text-base-content/60">
          Transactions whose description contains the vendor pattern count as payments of this item.
        </p>

        <fieldset className="fieldset mt-4">
          <legend className="fieldset-legend">Title</legend>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Sunrise Mobile"
            autoFocus
            className="input input-bordered w-full"
          />
        </fieldset>

        <fieldset className="fieldset mt-2">
          <legend className="fieldset-legend">Vendor (description contains)</legend>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="e.g. Sunrise GmbH"
            className="input input-bordered w-full"
          />
        </fieldset>

        <fieldset className="fieldset mt-2">
          <legend className="fieldset-legend">Frequency</legend>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="select select-bordered w-full capitalize"
          >
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </fieldset>

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !pattern.trim()}
            className="btn btn-primary"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
