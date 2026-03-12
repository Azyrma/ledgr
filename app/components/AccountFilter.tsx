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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allSelected = selected.length === 0;

  function toggleAccount(id: number) {
    if (selected.includes(id)) {
      const next = selected.filter((s) => s !== id);
      onChange(next);
    } else {
      onChange([...selected, id]);
    }
  }

  function selectAll() {
    onChange([]);
    setOpen(false);
  }

  const label = allSelected
    ? "All accounts"
    : selected.length === 1
    ? accounts.find((a) => a.id === selected[0])?.name ?? "1 account"
    : `${selected.length} accounts`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        {label}
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <button
            onClick={selectAll}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
              allSelected ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${allSelected ? "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50" : "border-zinc-300 dark:border-zinc-600"}`}>
              {allSelected && (
                <svg className="h-2.5 w-2.5 text-white dark:text-zinc-900" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M8.5 2.5L4 7 1.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            All accounts
          </button>

          {accounts.length > 0 && (
            <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
          )}

          {accounts.map((account) => {
            const checked = selected.includes(account.id);
            return (
              <button
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? "border-zinc-900 bg-zinc-900 dark:border-zinc-50 dark:bg-zinc-50" : "border-zinc-300 dark:border-zinc-600"}`}>
                  {checked && (
                    <svg className="h-2.5 w-2.5 text-white dark:text-zinc-900" viewBox="0 0 10 10" fill="currentColor">
                      <path d="M8.5 2.5L4 7 1.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={checked ? "font-medium text-zinc-900 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400"}>
                  {account.name}
                </span>
              </button>
            );
          })}

          {accounts.length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-500">No accounts added yet</p>
          )}
        </div>
      )}
    </div>
  );
}
