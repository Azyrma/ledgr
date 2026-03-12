"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CsvImportModal from "../components/CsvImportModal";
import AddTransactionModal from "../components/AddTransactionModal";
import TransactionFilters, { DEFAULT_FILTERS, type Filters } from "../components/TransactionFilters";
import SetCategoryPopover from "../components/SetCategoryPopover";

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  reimbursable: number;
  account_id: number;
  account_name: string;
  account_color: string;
  linked_transaction_id: number | null;
};

type Account = { id: number; name: string };

type EditState = {
  id: number;
  field: "date" | "description" | "account" | "category" | "amount";
  value: string;
  original: string;
} | null;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 2 }).format(value);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const INPUT_CLS =
  "w-full rounded border border-zinc-300 bg-white px-2 py-0.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts]         = useState<Account[]>([]);
  const [categories, setCategories]     = useState<string[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showImport, setShowImport]     = useState(false);
  const [showAdd, setShowAdd]           = useState(false);
  const [filters, setFilters]           = useState<Filters>(DEFAULT_FILTERS);
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [showCatPopover, setShowCatPopover] = useState(false);
  const [bulkWorking, setBulkWorking]   = useState(false);
  const [editing, setEditing]           = useState<EditState>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const uncategorisedCount = transactions.filter((t) => !t.category).length;
  const allSelected  = transactions.length > 0 && selected.size === transactions.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedTxs  = transactions.filter((t) => selected.has(t.id));
  const canLink      = selected.size === 2 && selectedTxs.every((t) => t.linked_transaction_id === null);
  const canUnlink    = selected.size === 1 && selectedTxs[0]?.linked_transaction_id !== null;

  const fetchTransactions = useCallback(async (f: Filters) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.search)      params.set("search",     f.search);
    if (f.from)        params.set("from",        f.from);
    if (f.to)          params.set("to",          f.to);
    if (f.account)     params.set("accountId",   f.account);
    if (f.category)    params.set("category",    f.category);
    if (f.minAmount)   params.set("minAmount",   f.minAmount);
    if (f.maxAmount)   params.set("maxAmount",   f.maxAmount);
    if (f.needsReview) params.set("needsReview", "true");

    const res  = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(Array.isArray(data) ? data.map((a: Account) => ({ id: a.id, name: a.name })) : []);
    });
    fetch("/api/transactions").then((r) => r.json()).then((data: Transaction[]) => {
      const cats = [...new Set(data.filter((t) => t.category).map((t) => t.category))].sort();
      setCategories(cats);
    });
  }, []);

  useEffect(() => { fetchTransactions(filters); }, [filters, fetchTransactions]);

  function refresh() { fetchTransactions(filters); }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(transactions.map((t) => t.id)));
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Inline editing ────────────────────────────────────────────────────────

  function startEdit(id: number, field: EditState["field"], value: string) {
    // Commit any previous edit first
    const e = editing;
    if (e !== null && (e.id !== id || e.field !== field)) {
      commitEdit();
    }
    setEditing({ id, field, value, original: value });
  }

  async function commitEdit(overrideValue?: string) {
    const e = editing;
    if (e === null) return;
    const { id, field, original } = e;
    const value = overrideValue ?? e.value;
    setEditing(null);

    // No change — skip the API call entirely
    if (value === original) return;

    const body: Record<string, string | number> = {};
    if (field === "account")     body.account_id = Number(value);
    else if (field === "amount") body.amount     = Number(value);
    else                         body[field]     = value;

    await fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    refresh();
  }

  function cancelEdit() { setEditing(null); }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  async function handleSetCategory(category: string) {
    setBulkWorking(true);
    setShowCatPopover(false);
    await fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], category }),
    });
    setBulkWorking(false);
    refresh();
  }

  async function handleLink() {
    setBulkWorking(true);
    await fetch("/api/transactions/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setBulkWorking(false);
    refresh();
  }

  async function handleUnlink() {
    setBulkWorking(true);
    await fetch("/api/transactions/link", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: [...selected][0] }),
    });
    setBulkWorking(false);
    refresh();
  }

  async function handleBulkDelete() {
    setBulkWorking(true);
    await fetch("/api/transactions/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setBulkWorking(false);
    refresh();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Transactions</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="flex w-40 items-center justify-center gap-2 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add transaction
          </button>
          <button onClick={() => setShowImport(true)} className="flex w-40 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-4">
        {/* Review banner */}
        {uncategorisedCount > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-800/60 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Some transactions need review</p>
                <p className="mt-0.5 text-sm text-amber-600 dark:text-amber-400">
                  {uncategorisedCount} transaction{uncategorisedCount !== 1 ? "s" : ""} need categorization
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilters((f) => ({ ...f, needsReview: !f.needsReview }))}
              className={`shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${filters.needsReview ? "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-800/40 dark:text-amber-300" : "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-800/30"}`}
            >
              {filters.needsReview ? "Show all" : "Show reviewable"}
            </button>
          </div>
        )}

        {/* Filters */}
        <TransactionFilters filters={filters} accounts={accounts} categories={categories} onChange={setFilters} />

        {/* Table */}
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <div className="grid grid-cols-[2.5rem_1fr_2fr_1fr_1fr_1fr] items-center border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-800 dark:border-zinc-600 dark:accent-zinc-400"
            />
            {["Date", "Description", "Account", "Category", "Amount"].map((h, i) => (
              <span key={h} className={`text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 ${i === 4 ? "text-right" : ""}`}>
                {h}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="h-6 w-6 animate-spin text-zinc-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-200 dark:text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">No transactions found</p>
              <p className="text-xs text-zinc-300 dark:text-zinc-600">Try adjusting your filters or import a bank export</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {transactions.map((t) => {
                const isEditing = (field: EditState["field"]) =>
                  editing !== null && editing.id === t.id && editing.field === field;

                return (
                  <div
                    key={t.id}
                    className={`grid grid-cols-[2.5rem_1fr_2fr_1fr_1fr_1fr] items-center px-5 py-2.5 transition-colors ${selected.has(t.id) ? "bg-zinc-50 dark:bg-zinc-800/60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"}`}
                  >
                    {/* Checkbox — only interactive element for selection */}
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-800 dark:border-zinc-600 dark:accent-zinc-400"
                    />

                    {/* Date */}
                    <div className="pr-2">
                      {isEditing("date") ? (
                        <input
                          type="date"
                          autoFocus
                          value={editing!.value}
                          onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
                          onBlur={() => commitEdit()}
                          onKeyDown={handleEditKeyDown}
                          className={INPUT_CLS}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(t.id, "date", t.date)}
                          className="cursor-text text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                          title="Click to edit"
                        >
                          {formatDate(t.date)}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <div className="pr-4">
                      {isEditing("description") ? (
                        <input
                          type="text"
                          autoFocus
                          value={editing!.value}
                          onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
                          onBlur={() => commitEdit()}
                          onKeyDown={handleEditKeyDown}
                          className={INPUT_CLS}
                        />
                      ) : (
                        <div className="flex min-w-0 items-center gap-1.5">
                          {t.linked_transaction_id !== null && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" title="Linked transfer">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          )}
                          <span
                            onClick={() => startEdit(t.id, "description", t.description)}
                            className="block cursor-text truncate text-sm text-zinc-800 hover:text-zinc-600 dark:text-zinc-200 dark:hover:text-zinc-400"
                            title={t.description}
                          >
                            {t.description}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Account */}
                    <div className="pr-2">
                      {isEditing("account") ? (
                        <select
                          autoFocus
                          value={editing!.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditing(null);
                            fetch(`/api/transactions/${t.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ account_id: Number(val) }),
                            }).then(() => refresh());
                          }}
                          onBlur={cancelEdit}
                          onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
                          className={INPUT_CLS}
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div
                          onClick={() => startEdit(t.id, "account", String(t.account_id))}
                          className="flex cursor-pointer items-center gap-1.5"
                          title="Click to edit"
                        >
                          {t.account_color && (
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.account_color }} />
                          )}
                          <span className="truncate text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                            {t.account_name ?? "—"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div className="relative pr-2">
                      {isEditing("category") ? (
                        <SetCategoryPopover
                          direction="down"
                          onSelect={(cat) => {
                            setEditing(null);
                            fetch(`/api/transactions/${t.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ category: cat }),
                            }).then(() => refresh());
                          }}
                          onClose={cancelEdit}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(t.id, "category", t.category)}
                          className={`block cursor-pointer truncate text-sm hover:underline ${t.category ? "text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200" : "text-amber-500 dark:text-amber-400"}`}
                          title="Click to edit"
                        >
                          {t.category || "Uncategorised"}
                        </span>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      {isEditing("amount") ? (
                        <input
                          type="number"
                          autoFocus
                          step="0.01"
                          value={editing!.value}
                          onChange={(e) => setEditing({ ...editing!, value: e.target.value })}
                          onBlur={() => commitEdit()}
                          onKeyDown={handleEditKeyDown}
                          className={INPUT_CLS + " text-right"}
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(t.id, "amount", String(t.amount))}
                          className={`block cursor-text text-right text-sm font-medium tabular-nums hover:underline ${t.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-800 dark:text-zinc-200"}`}
                          title="Click to edit"
                        >
                          {formatCurrency(t.amount)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div ref={barRef} className="relative flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
              {selected.size} transaction{selected.size !== 1 ? "s" : ""} selected
            </span>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Set category */}
            <div className="relative">
              <button
                onClick={() => setShowCatPopover((v) => !v)}
                disabled={bulkWorking}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Set category
              </button>
              {showCatPopover && (
                <SetCategoryPopover
                  onSelect={handleSetCategory}
                  onClose={() => setShowCatPopover(false)}
                />
              )}
            </div>

            {/* Link as transfer */}
            {canLink && (
              <button
                onClick={handleLink}
                disabled={bulkWorking}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Link as transfer
              </button>
            )}

            {/* Unlink transfer */}
            {canUnlink && (
              <button
                onClick={handleUnlink}
                disabled={bulkWorking}
                className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
                Unlink transfer
              </button>
            )}

            {/* Delete */}
            <button
              onClick={handleBulkDelete}
              disabled={bulkWorking}
              className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete
            </button>

            {/* Dismiss */}
            <button onClick={() => setSelected(new Set())} className="ml-1 text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {showAdd    && <AddTransactionModal onClose={() => setShowAdd(false)}    onSaved={refresh} />}
      {showImport && <CsvImportModal      onClose={() => setShowImport(false)} onImported={refresh} />}
    </div>
  );
}
