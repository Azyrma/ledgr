"use client";

import { useState } from "react";

type Props = {
  parentId: number;
  parentName: string;
  initial?: { id: number; name: string };
  onClose: () => void;
  onSaved: () => void;
};

export default function CategoryModal({ parentId, parentName, initial, onClose, onSaved }: Props) {
  const isEdit = !!initial;
  const [name, setName]     = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    try {
      const url    = isEdit ? `/api/categories/${initial!.id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";
      const body   = isEdit ? { name } : { name, parent_id: parentId };

      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed.");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm">
        <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4">✕</button>
        <h3 className="text-lg font-bold">
          {isEdit ? "Rename category" : "Add category"}
        </h3>
        {!isEdit && (
          <p className="mt-0.5 text-sm text-base-content/50">Under: {parentName}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input input-bordered w-full"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </form>

        <div className="modal-action">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
