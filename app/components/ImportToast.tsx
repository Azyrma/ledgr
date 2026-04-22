"use client";

import { useEffect, useRef, useState } from "react";

export type ImportedDetail = {
  id: number;
  filename: string;
  account_name: string;
  count: number;
};

export default function ImportToast() {
  const [data, setData]       = useState<ImportedDetail | null>(null);
  const [progress, setProgress] = useState(100);
  const [undoing, setUndoing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout>  | null>(null);

  function clear() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current)  clearTimeout(timeoutRef.current);
  }

  useEffect(() => {
    function onImported(e: Event) {
      const detail = (e as CustomEvent<ImportedDetail>).detail;
      clear();
      setData(detail);
      setProgress(100);
      setUndoing(false);

      const start    = Date.now();
      const duration = 10_000;

      intervalRef.current = setInterval(() => {
        const pct = Math.max(0, 100 - ((Date.now() - start) / duration) * 100);
        setProgress(pct);
        if (pct === 0) clearInterval(intervalRef.current!);
      }, 80);

      timeoutRef.current = setTimeout(() => setData(null), duration);
    }

    window.addEventListener("ledgr:imported", onImported);
    return () => {
      window.removeEventListener("ledgr:imported", onImported);
      clear();
    };
  }, []);

  async function handleUndo() {
    if (!data) return;
    clear();
    setUndoing(true);
    await fetch(`/api/imports?id=${data.id}`, { method: "DELETE" });
    setData(null);
    window.dispatchEvent(new CustomEvent("ledgr:refresh"));
  }

  if (!data) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, left: 24, zIndex: 100,
      width: 340,
      background: "var(--surface)",
      border: "1px solid var(--hair)",
      borderRadius: 12,
      boxShadow: "var(--shadow-3)",
      overflow: "hidden",
    }}>
      {/* countdown bar */}
      <div style={{ height: 3, background: "var(--hair)", position: "relative" }}>
        <div style={{
          position: "absolute", top: 0, left: 0, height: "100%",
          width: `${progress}%`,
          background: "var(--brand)",
          transition: "width 0.08s linear",
        }} />
      </div>

      <div style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 2 }}>
            Import complete
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {data.count} transaction{data.count !== 1 ? "s" : ""} · {data.account_name}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.filename}
          </div>
        </div>
        <button
          onClick={handleUndo}
          disabled={undoing}
          className="btn btn-sm btn-ghost"
          style={{ flexShrink: 0, color: "var(--neg)" }}
        >
          {undoing ? "Undoing…" : "Undo"}
        </button>
      </div>
    </div>
  );
}
