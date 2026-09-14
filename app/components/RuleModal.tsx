"use client";

import { useState } from "react";
import SetCategoryPopover from "./SetCategoryPopover";

export type Rule = { id: number; pattern: string; category: string };

type Props = {
  /** Existing rule to edit; omit to create a new one. */
  initial?: Rule;
  /** Prefill for the pattern field when creating (e.g. a transaction's description). */
  initialPattern?: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function RuleModal({ initial, initialPattern, onClose, onSaved }: Props) {
  const [pattern, setPattern]   = useState(initial?.pattern ?? initialPattern ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function handleSave() {
    if (!pattern.trim() || !category) return;
    setSaving(true);
    const res = await fetch(initial ? `/api/rules/${initial.id}` : "/api/rules", {
      method: initial ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern, category }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to save rule.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-md overflow-visible">
        <h3 className="text-lg font-bold">{initial ? "Edit rule" : "Add rule"}</h3>
        <p className="mt-1 text-sm text-base-content/60">
          Imported transactions whose description contains the pattern get the category automatically.
        </p>

        <fieldset className="fieldset mt-4">
          <legend className="fieldset-legend">Description contains</legend>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="e.g. MIGROS"
            autoFocus
            className="input input-bordered w-full"
          />
        </fieldset>

        <fieldset className="fieldset mt-2">
          <legend className="fieldset-legend">Category</legend>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              className="btn btn-outline btn-sm w-full justify-start font-normal"
            >
              {category || <span className="text-base-content/40">Select a category…</span>}
            </button>
            {showPicker && (
              <SetCategoryPopover
                direction="down"
                transferAccounts={[]}
                onSelect={(cat) => { setCategory(cat); setShowPicker(false); }}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </fieldset>

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !pattern.trim() || !category}
            className="btn btn-primary"
          >
            {saving ? "Saving…" : "Save rule"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
