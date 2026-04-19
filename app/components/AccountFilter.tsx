"use client";

import { useEffect, useRef, useState } from "react";

export type Account = {
  id: number;
  name: string;
};

type Props = {
  accounts: Account[];
  selected: number[];
  onChange: (selected: number[]) => void;
};

export default function AccountFilter({ accounts, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = selected.length === 0;

  function toggleAccount(id: number) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  const label = allSelected
    ? "All accounts"
    : selected.length === 1
    ? accounts.find((a) => a.id === selected[0])?.name ?? "1 account"
    : `${selected.length} accounts`;

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn btn-sm" style={{ gap: 6 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        {label}
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 12, boxShadow: "var(--shadow-3)",
          padding: 6, minWidth: 240,
        }}>
          {/* All accounts */}
          <button
            onClick={() => { onChange([]); setOpen(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "7px 10px", borderRadius: 6,
              fontSize: 13, color: allSelected ? "var(--brand)" : "var(--ink-2)",
              background: allSelected ? "var(--brand-soft)" : "transparent",
            }}
            onMouseEnter={(e) => { if (!allSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
            onMouseLeave={(e) => { if (!allSelected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <Check checked={allSelected} />
            All accounts
          </button>

          {accounts.length > 0 && <div style={{ height: 1, background: "var(--hair)", margin: "6px 0" }} />}

          {accounts.map((account) => {
            const checked = selected.includes(account.id);
            return (
              <button
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "7px 10px", borderRadius: 6,
                  fontSize: 13, color: "var(--ink-2)", background: "transparent",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Check checked={checked} />
                <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {account.name}
                </span>
              </button>
            );
          })}

          {accounts.length === 0 && (
            <div className="muted" style={{ padding: "6px 10px", fontSize: 12 }}>No accounts added yet</div>
          )}
        </div>
      )}
    </div>
  );
}

function Check({ checked }: { checked: boolean }) {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
      border: `1.5px solid ${checked ? "var(--brand)" : "var(--ink-4)"}`,
      background: checked ? "var(--brand)" : "transparent",
      display: "inline-grid", placeItems: "center", transition: "all .1s ease",
    }}>
      {checked && (
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--brand-ink)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12l5 5L20 6" />
        </svg>
      )}
    </span>
  );
}
