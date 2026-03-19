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
    <div className="dropdown dropdown-end" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-outline btn-sm gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        {label}
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 opacity-50 transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="dropdown-content menu bg-base-100 rounded-box z-10 mt-1 w-52 border border-base-300 p-2 shadow-lg">
          <li>
            <button onClick={selectAll} className={allSelected ? "menu-active" : ""}>
              <input type="checkbox" className="checkbox checkbox-sm" checked={allSelected} readOnly />
              All accounts
            </button>
          </li>
          {accounts.length > 0 && <li className="menu-title"></li>}
          {accounts.map((account) => {
            const checked = selected.includes(account.id);
            return (
              <li key={account.id}>
                <button onClick={() => toggleAccount(account.id)}>
                  <input type="checkbox" className="checkbox checkbox-sm" checked={checked} readOnly />
                  {account.name}
                </button>
              </li>
            );
          })}
          {accounts.length === 0 && (
            <li className="disabled"><span className="text-xs">No accounts added yet</span></li>
          )}
        </ul>
      )}
    </div>
  );
}
