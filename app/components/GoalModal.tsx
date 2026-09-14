"use client";

import { useState } from "react";

export type Goal = {
  id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  color: string | null;
};

const COLORS = ["#6FA77A", "#7FA8C0", "#C98B8B", "#D4A574", "#8B7AA8", "#B89466"];

type Props = {
  initial?: Goal;
  onClose: () => void;
  onSaved: () => void;
};

export default function GoalModal({ initial, onClose, onSaved }: Props) {
  const [name, setName]     = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? String(initial.target_amount) : "");
  const [date, setDate]     = useState(initial?.target_date ?? "");
  const [color, setColor]   = useState(initial?.color ?? COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSave() {
    if (!name.trim() || !(Number(target) > 0)) return;
    setSaving(true);
    const res = await fetch(initial ? `/api/goals/${initial.id}` : "/api/goals", {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, target_amount: Number(target), target_date: date || null, color }),
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
        <h3 className="text-lg font-bold">{initial ? "Edit goal" : "New goal"}</h3>

        <fieldset className="fieldset mt-4">
          <legend className="fieldset-legend">Name</legend>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emergency fund"
            autoFocus
            className="input input-bordered w-full"
          />
        </fieldset>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Target amount (CHF)</legend>
            <input
              type="number"
              min={0}
              step={100}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="10000"
              className="input input-bordered w-full"
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Target date (optional)</legend>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>
        </div>

        <fieldset className="fieldset mt-2">
          <legend className="fieldset-legend">Color</legend>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-7 w-7 rounded-full"
                style={{ background: c, outline: color === c ? "2px solid var(--ink)" : "none", outlineOffset: 2 }}
                title={c}
              />
            ))}
          </div>
        </fieldset>

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !(Number(target) > 0)}
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
