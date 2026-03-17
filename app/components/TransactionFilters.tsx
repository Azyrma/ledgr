"use client";

import { useEffect, useRef, useState } from "react";

export type Filters = {
  search: string;
  from: string;
  to: string;
  account: string;
  category: string;
  minAmount: string;
  maxAmount: string;
  needsReview: boolean;
  reimbursable: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  search: "",
  from: "",
  to: "",
  account: "",
  category: "",
  minAmount: "",
  maxAmount: "",
  needsReview: false,
  reimbursable: false,
};

type Account = { id: number; name: string };

type Props = {
  filters: Filters;
  accounts: Account[];
  categories: string[];
  onChange: (filters: Filters) => void;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-600 dark:focus:ring-zinc-600";

export default function TransactionFilters({ filters, accounts, categories, onChange }: Props) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Sync external resets (e.g. "Clear" button)
  useEffect(() => { setLocalSearch(filters.search); }, [filters.search]);

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function handleSearch(val: string) {
    setLocalSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => set("search", val), 300);
  }

  const isActive =
    filters.search ||
    filters.from ||
    filters.to ||
    filters.account ||
    filters.category ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.needsReview ||
    filters.reimbursable;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4">

        {/* Row 1: Search + From + To */}
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
          <Field label="Search">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-300 dark:text-zinc-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search descriptions…"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className={`${inputClass} w-full pl-9`}
              />
            </div>
          </Field>

          <Field label="From">
            <input
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
              className={`${inputClass} w-full`}
            />
          </Field>

          <Field label="To">
            <input
              type="date"
              value={filters.to}
              onChange={(e) => set("to", e.target.value)}
              className={`${inputClass} w-full`}
            />
          </Field>
        </div>

        {/* Row 2: Category + Account + Min + Max + Needs review + Clear */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Field label="Category">
              <select
                value={filters.category}
                onChange={(e) => set("category", e.target.value)}
                className={`${inputClass} w-full`}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex-1">
            <Field label="Account">
              <select
                value={filters.account}
                onChange={(e) => set("account", e.target.value)}
                className={`${inputClass} w-full`}
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex-1">
            <Field label="Min amount">
              <input
                type="number"
                placeholder="0.00"
                value={filters.minAmount}
                onChange={(e) => set("minAmount", e.target.value)}
                className={`${inputClass} w-full`}
              />
            </Field>
          </div>

          <div className="flex-1">
            <Field label="Max amount">
              <input
                type="number"
                placeholder="0.00"
                value={filters.maxAmount}
                onChange={(e) => set("maxAmount", e.target.value)}
                className={`${inputClass} w-full`}
              />
            </Field>
          </div>

          <div className="flex items-center gap-2 pb-2.5">
            <input
              id="needs-review"
              type="checkbox"
              checked={filters.needsReview}
              onChange={(e) => set("needsReview", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-800 dark:border-zinc-600 dark:accent-zinc-400"
            />
            <label htmlFor="needs-review" className="cursor-pointer whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
              Needs review
            </label>
          </div>

          <div className="flex items-center gap-2 pb-2.5">
            <input
              id="reimbursable"
              type="checkbox"
              checked={filters.reimbursable}
              onChange={(e) => set("reimbursable", e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-800 dark:border-zinc-600 dark:accent-zinc-400"
            />
            <label htmlFor="reimbursable" className="cursor-pointer whitespace-nowrap text-sm text-zinc-600 dark:text-zinc-400">
              Owed by parents
            </label>
          </div>

          {isActive && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="pb-2.5 text-sm text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
