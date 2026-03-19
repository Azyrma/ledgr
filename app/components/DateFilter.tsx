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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = DATE_RANGES.find((r) => r.value === selected)?.label ?? "Last 30 days";

  return (
    <div className="dropdown dropdown-end" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-outline btn-sm gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {currentLabel}
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="dropdown-content menu bg-base-100 rounded-box z-10 mt-1 w-44 border border-base-300 p-2 shadow-lg">
          {DATE_RANGES.map((range) => (
            <li key={range.value}>
              <button
                onClick={() => { onChange(range.value); setOpen(false); }}
                className={range.value === selected ? "menu-active" : ""}
              >
                {range.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
