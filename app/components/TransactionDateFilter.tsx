"use client";

import { useEffect, useRef, useState } from "react"; // useRef kept for click-outside detection

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const today = () => toIso(new Date());

const PRESETS = [
  {
    label: "7d",
    resolve: () => {
      const d = new Date(); d.setDate(d.getDate() - 6);
      return { from: toIso(d), to: today() };
    },
  },
  {
    label: "14d",
    resolve: () => {
      const d = new Date(); d.setDate(d.getDate() - 13);
      return { from: toIso(d), to: today() };
    },
  },
  {
    label: "30d",
    resolve: () => {
      const d = new Date(); d.setDate(d.getDate() - 29);
      return { from: toIso(d), to: today() };
    },
  },
  {
    label: "This month",
    resolve: () => {
      const n = new Date();
      return {
        from: toIso(new Date(n.getFullYear(), n.getMonth(), 1)),
        to:   toIso(new Date(n.getFullYear(), n.getMonth() + 1, 0)),
      };
    },
  },
  {
    label: "Last month",
    resolve: () => {
      const n = new Date();
      const first = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const last  = new Date(n.getFullYear(), n.getMonth(), 0);
      return { from: toIso(first), to: toIso(last) };
    },
  },
  {
    label: "This year",
    resolve: () => ({ from: toIso(new Date(new Date().getFullYear(), 0, 1)), to: today() }),
  },
  {
    label: "Last year",
    resolve: () => {
      const y = new Date().getFullYear() - 1;
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    },
  },
  {
    label: "All time",
    resolve: () => ({ from: "", to: "" }),
  },
] as const;

function matchPreset(from: string, to: string): string | null {
  const t = today();
  for (const p of PRESETS) {
    const r = p.resolve();
    if (p.label === "All time") {
      if (!from && !to) return p.label;
      continue;
    }
    if (r.from === from && (r.to === to || r.to === t && to === t)) return p.label;
  }
  return null;
}

function buttonLabel(from: string, to: string): string {
  const preset = matchPreset(from, to);
  if (preset) return preset;
  if (!from && !to) return "All time";
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  return `To ${to}`;
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>{label}</div>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "6px 8px", fontSize: 13,
          border: "1px solid var(--hair-2)", borderRadius: 6,
          background: "var(--surface)", color: "var(--ink)",
          outline: "none",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
        onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--hair-2)")}
      />
    </div>
  );
}

export default function TransactionDateFilter({ from, to, onChange }: Props) {
  const [open, setOpen]     = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo,   setLocalTo]   = useState(to);
  const ref = useRef<HTMLDivElement>(null);

  // Keep local state in sync when parent resets filters
  useEffect(() => { setLocalFrom(from); }, [from]);
  useEffect(() => { setLocalTo(to); },   [to]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function applyPreset(resolve: () => { from: string; to: string }) {
    const r = resolve();
    setLocalFrom(r.from);
    setLocalTo(r.to);
    onChange(r.from, r.to);
    setOpen(false);
  }

  function applyCustom() {
    onChange(localFrom, localTo);
    setOpen(false);
  }

  const active = !!(from || to);
  const label  = buttonLabel(from, to);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`btn btn-sm ${active ? "btn-neutral" : "btn-outline"}`}
        style={{ gap: 6 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {label}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 12, boxShadow: "var(--shadow-3)",
          display: "flex", gap: 0, minWidth: 380,
        }}>
          {/* Preset list */}
          <div style={{ padding: 6, borderRight: "1px solid var(--hair)", minWidth: 130 }}>
            {PRESETS.map((p) => {
              const selected = matchPreset(from, to) === p.label || (p.label === "All time" && !from && !to);
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.resolve)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "7px 10px", borderRadius: 6, fontSize: 13,
                    color: selected ? "var(--brand)" : "var(--ink-2)",
                    background: selected ? "var(--brand-soft)" : "transparent",
                    fontWeight: selected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Custom range */}
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Custom range
            </div>
            <DateInput label="Start" value={localFrom} onChange={setLocalFrom} />
            <DateInput label="End"   value={localTo}   onChange={setLocalTo} />

            <button
              onClick={applyCustom}
              className="btn btn-sm btn-primary"
              style={{ marginTop: 2 }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
