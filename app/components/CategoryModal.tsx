"use client";

import { useState } from "react";

type Props = {
  parentId: number;
  parentName: string;
  initial?: { id: number; name: string };
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {isEdit ? "Rename category" : "Add category"}
            </h2>
            {!isEdit && (
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">Under: {parentName}</p>
            )}
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <input
            type="text"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </form>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900">
            {saving ? "Saving…" : isEdit ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
