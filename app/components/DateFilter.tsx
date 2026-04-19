"use client";

import { useEffect, useRef, useState } from "react";

export type DateRange = {
  label: string;
  value: string;
};

export const DATE_RANGES: DateRange[] = [
  { label: "This month",      value: "mtd"       },
  { label: "Last month",      value: "1month"    },
  { label: "Last 2 months",   value: "2month"    },
  { label: "Last 3 months",   value: "3month"    },
  { label: "Last 6 months",   value: "6month"    },
  { label: "Last 12 months",  value: "12m"       },
  { label: "Year to date",    value: "ytd"       },
  { label: "Last year",       value: "lastyear"  },
  { label: "All time",        value: "all"       },
];

type Props = {
  selected: string;
  onChange: (value: string) => void;
};

export default function DateFilter({ selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = DATE_RANGES.find((r) => r.value === selected)?.label ?? "This month";

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="btn btn-sm" style={{ gap: 6 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {currentLabel}
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6, transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 12, boxShadow: "var(--shadow-3)",
          padding: 6, minWidth: 200,
        }}>
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => { onChange(range.value); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "7px 10px", borderRadius: 6,
                fontSize: 13, textAlign: "left",
                color: range.value === selected ? "var(--brand)" : "var(--ink-2)",
                background: range.value === selected ? "var(--brand-soft)" : "transparent",
              }}
              onMouseEnter={(e) => { if (range.value !== selected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
              onMouseLeave={(e) => { if (range.value !== selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              {range.value === selected && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              )}
              {range.value !== selected && <span style={{ width: 12 }} />}
              {range.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
