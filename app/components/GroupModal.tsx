"use client";

import { useState } from "react";

type Props = {
  parentId: number;
  parentName: string;
  edit?: { id: number; name: string };
  onClose: () => void;
  onSaved: () => void;
};

export default function GroupModal({ parentId, parentName, edit, onClose, onSaved }: Props) {
  const isEdit = !!edit;
  const [name,   setName]   = useState(edit?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    try {
      const url    = isEdit ? `/api/categories/${edit!.id}` : "/api/categories";
      const method = isEdit ? "PUT" : "POST";
      const body   = isEdit
        ? { name: name.trim() }
        : { name: name.trim(), parent_id: parentId };

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
      <div className="modal-box" style={{
        maxWidth: 380, padding: 0, borderRadius: 16,
        background: "var(--surface)", border: "1px solid var(--hair)",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="display-serif" style={{ fontSize: 17 }}>{isEdit ? "Edit group" : "New group"}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{isEdit ? edit!.name : `Under: ${parentName}`}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          <label className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
            Group name
          </label>
          <input
            type="text"
            placeholder="e.g. Housing, Entertainment…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
              border: "1px solid var(--hair-2)", background: "var(--surface)",
              color: "var(--ink)", outline: "none", boxSizing: "border-box",
            }}
          />
          {error && <p style={{ marginTop: 6, fontSize: 12, color: "var(--neg)" }}>{error}</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-sm btn-primary">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create group"}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}
