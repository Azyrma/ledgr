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
  transfers: boolean;
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
  transfers: false,
};

type Account = { id: number; name: string };

type Props = {
  filters: Filters;
  accounts: Account[];
  categories: string[];
  onChange: (filters: Filters) => void;
};

export default function TransactionFilters({ filters, accounts, categories, onChange }: Props) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

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
    filters.reimbursable ||
    filters.transfers;

  return (
    <div className="card bg-base-100 border border-base-300">
      <div className="card-body p-5 gap-4">
        {/* Row 1: Search + From + To */}
        <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Search</legend>
            <label className="input input-bordered w-full flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search descriptions…"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="grow"
              />
            </label>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">From</legend>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => set("from", e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">To</legend>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => set("to", e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>
        </div>

        {/* Row 2: Category + Account + Min + Max */}
        <div className="grid grid-cols-4 gap-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Category</legend>
            <select
              value={filters.category}
              onChange={(e) => set("category", e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Account</legend>
            <select
              value={filters.account}
              onChange={(e) => set("account", e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.name}</option>
              ))}
            </select>
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Min amount</legend>
            <input
              type="number"
              placeholder="0.00"
              value={filters.minAmount}
              onChange={(e) => set("minAmount", e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">Max amount</legend>
            <input
              type="number"
              placeholder="0.00"
              value={filters.maxAmount}
              onChange={(e) => set("maxAmount", e.target.value)}
              className="input input-bordered w-full"
            />
          </fieldset>
        </div>

        {/* Row 3: Checkboxes + Clear */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <input
              id="needs-review"
              type="checkbox"
              checked={filters.needsReview}
              onChange={(e) => set("needsReview", e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <label htmlFor="needs-review" className="cursor-pointer whitespace-nowrap text-sm">
              Needs review
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="reimbursable"
              type="checkbox"
              checked={filters.reimbursable}
              onChange={(e) => set("reimbursable", e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <label htmlFor="reimbursable" className="cursor-pointer whitespace-nowrap text-sm">
              Owed by parents
            </label>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="transfers"
              type="checkbox"
              checked={filters.transfers}
              onChange={(e) => set("transfers", e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <label htmlFor="transfers" className="cursor-pointer whitespace-nowrap text-sm">
              Transfers
            </label>
          </div>

          {isActive && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="btn btn-ghost btn-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
