"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onSelect: (mode: "filtered" | "all") => void;
};

const ITEMS: { mode: "filtered" | "all"; label: string }[] = [
  { mode: "filtered", label: "Download Filtered" },
  { mode: "all",      label: "Download All" },
];

export default function DownloadMenu({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-sm btn-outline"
        style={{ gap: 6 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 12, boxShadow: "var(--shadow-3)",
          padding: 6, minWidth: 180,
        }}>
          {ITEMS.map((item) => (
            <button
              key={item.mode}
              onClick={() => { onSelect(item.mode); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "7px 10px", borderRadius: 6, fontSize: 13,
                color: "var(--ink-2)", background: "transparent",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-2)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
