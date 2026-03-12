"use client";

import { useEffect, useRef, useState } from "react";

export type DateRange = {
  label: string;
  value: string;
};

export const DATE_RANGES: DateRange[] = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 3 months", value: "3m" },
  { label: "Last 12 months", value: "12m" },
  { label: "All time", value: "all" },
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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = DATE_RANGES.find((r) => r.value === selected)?.label ?? "Last 30 days";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {currentLabel}
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {DATE_RANGES.map((range) => {
            const isSelected = range.value === selected;
            return (
              <button
                key={range.value}
                onClick={() => { onChange(range.value); setOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                  isSelected ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {range.label}
                {isSelected && (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
