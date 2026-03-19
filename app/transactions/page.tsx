"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import CsvImportModal from "../components/CsvImportModal";
import AddTransactionModal from "../components/AddTransactionModal";
import ExportCsvModal from "../components/ExportCsvModal";
import TransactionFilters, { DEFAULT_FILTERS, type Filters } from "../components/TransactionFilters";
import SetCategoryPopover, { buildSections, type Section } from "../components/SetCategoryPopover";
import { formatCurrency } from "@/lib/utils";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  reimbursable: number;
  needs_review: number;
  account_id: number;
  account_name: string;
  account_color: string;
  account_currency: string;
  exchange_rate: number;
  linked_transaction_id: number | null;
};

type Account = { id: number; name: string; color: string | null; currency: string; exchange_rate: number };

type SortState = {
  field: "date" | "description" | "account" | "category" | "amount";
  dir: "asc" | "desc";
};

const COLUMNS: { label: string; field: SortState["field"] }[] = [
  { label: "Date",        field: "date" },
  { label: "Description", field: "description" },
  { label: "Account",     field: "account" },
  { label: "Category",    field: "category" },
  { label: "Amount",      field: "amount" },
];

type EditState = {
  id: number;
  field: "date" | "description" | "account" | "category" | "amount";
  value: string;
  original: string;
} | null;

type LatestImport = {
  id: number;
  filename: string;
  account_name: string;
  count: number;
  imported_at: string;
} | null;

type RecatDialog = {
  originalCat: string;
  newCat: string;
  transactionId: number;
  matchIds: number[];
};

type CatPopoverTarget = {
  id: number;
  category: string;
  needs_review: number;
  rect: DOMRect;
} | null;

// Callbacks passed via stable ref to memoized rows — avoids full-list re-renders on edit state change
type RowCallbacks = {
  startEdit: (id: number, field: NonNullable<EditState>["field"], value: string) => void;
  setEditing: React.Dispatch<React.SetStateAction<EditState>>;
  commitEdit: () => Promise<void>;
  cancelEdit: () => void;
  handleEditKeyDown: (e: React.KeyboardEvent) => void;
  toggleOne: (id: number) => void;
  refresh: () => void;
  setRecatDialog: React.Dispatch<React.SetStateAction<RecatDialog | null>>;
  transactions: Transaction[];
  optimisticUpdate: (id: number, changes: Partial<Transaction>) => void;
  patchTransaction: (id: number, body: Record<string, unknown>) => void;
  openCategoryPopover: (id: number, category: string, needsReview: number, rect: DOMRect) => void;
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function buildCategoryPathMap(cats: FlatCat[]): Map<string, string> {
  const nodeMap = buildCategoryNodeMap(cats);
  const result = new Map<string, string>();
  nodeMap.forEach((cat, id) => {
    if (!cat.is_system) result.set(cat.name, getCategoryPath(id, nodeMap));
  });
  return result;
}

const INPUT_CLS =
  "w-full input input-bordered input-sm";

// ── Memoized row — only re-renders when its own data or edit/select state changes ──────────────

const TransactionRow = memo(function TransactionRow({
  t,
  isEditing,
  editingField,
  editingValue,
  isSelected,
  accounts,
  categoryPaths,
  cbRef,
}: {
  t: Transaction;
  isEditing: boolean;
  editingField: NonNullable<EditState>["field"] | null;
  editingValue: string;
  isSelected: boolean;
  accounts: Account[];
  categoryPaths: Map<string, string>;
  cbRef: { current: RowCallbacks };
}) {
  const isEditingField = (field: NonNullable<EditState>["field"]) =>
    isEditing && editingField === field;

  return (
    <div
      className={`grid grid-cols-[2.5rem_5.5rem_2fr_1fr_1.5fr_1fr] items-center px-5 py-2.5 transition-colors ${
        isSelected ? "bg-base-200" : "hover:bg-base-200"
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => cbRef.current.toggleOne(t.id)}
        className="checkbox checkbox-sm"
      />

      {/* Date */}
      <div className="pr-2">
        {isEditingField("date") ? (
          <input
            type="date"
            autoFocus
            value={editingValue}
            onChange={(e) =>
              cbRef.current.setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)
            }
            onBlur={() => cbRef.current.commitEdit()}
            onKeyDown={cbRef.current.handleEditKeyDown}
            className={INPUT_CLS}
          />
        ) : (
          <span
            onClick={() => cbRef.current.startEdit(t.id, "date", t.date)}
            className="cursor-text text-sm text-base-content/50 hover:text-base-content"
            title="Click to edit"
          >
            {formatDate(t.date)}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="min-w-0 pr-4">
        {isEditingField("description") ? (
          <input
            type="text"
            autoFocus
            value={editingValue}
            onChange={(e) =>
              cbRef.current.setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)
            }
            onBlur={() => cbRef.current.commitEdit()}
            onKeyDown={cbRef.current.handleEditKeyDown}
            className={INPUT_CLS}
          />
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            {t.linked_transaction_id !== null && (
              <span title="Linked transfer" className="shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
            )}
            <span
              onClick={() => cbRef.current.startEdit(t.id, "description", t.description)}
              className="block cursor-text truncate text-sm text-base-content hover:text-base-content/70"
              title={t.description}
            >
              {t.description}
            </span>
          </div>
        )}
      </div>

      {/* Account */}
      <div className="pr-2">
        {isEditingField("account") ? (
          <select
            autoFocus
            value={editingValue}
            onChange={(e) => {
              const val = Number(e.target.value);
              const acc = accounts.find(a => a.id === val);
              cbRef.current.setEditing(null);
              if (acc) {
                cbRef.current.optimisticUpdate(t.id, {
                  account_id: val,
                  account_name: acc.name,
                  account_color: acc.color ?? "",
                  account_currency: acc.currency,
                  exchange_rate: acc.exchange_rate,
                });
              }
              cbRef.current.patchTransaction(t.id, { account_id: val });
            }}
            onBlur={cbRef.current.cancelEdit}
            onKeyDown={(e) => { if (e.key === "Escape") cbRef.current.cancelEdit(); }}
            className={INPUT_CLS}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        ) : (
          <div
            onClick={() => cbRef.current.startEdit(t.id, "account", String(t.account_id))}
            className="flex min-w-0 cursor-pointer items-center gap-1.5"
            title="Click to edit"
          >
            {t.account_color && (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.account_color }} />
            )}
            <span className="truncate text-sm text-base-content/50 hover:text-base-content">
              {t.account_name ?? "—"}
            </span>
          </div>
        )}
      </div>

      {/* Category — popover rendered at page level to avoid row re-renders */}
      <div className="relative min-w-0 pr-2">
        {t.needs_review && t.category ? (
          <div
            onClick={(e) => cbRef.current.openCategoryPopover(t.id, t.category, t.needs_review, (e.currentTarget as HTMLElement).getBoundingClientRect())}
            className="flex min-w-0 cursor-pointer items-center gap-1.5"
            title={`"${t.category}" was not found in your categories`}
          >
            <span className="truncate text-sm text-error hover:underline">
              {t.category}
            </span>
            <span className="badge badge-sm badge-error">
              not found
            </span>
          </div>
        ) : (
          <span
            onClick={(e) => cbRef.current.openCategoryPopover(t.id, t.category, t.needs_review, (e.currentTarget as HTMLElement).getBoundingClientRect())}
            className={`block cursor-pointer truncate text-sm hover:underline ${
              t.category
                ? "text-base-content/70"
                : "text-warning"
            }`}
            title={(categoryPaths.get(t.category) ?? t.category) || "Uncategorised"}
          >
            {t.category ? (categoryPaths.get(t.category) ?? t.category) : "Uncategorised"}
          </span>
        )}
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5">
        <button
          title={t.reimbursable ? "Owed by parents — click to unmark" : "Mark as owed by parents"}
          onClick={() => {
            cbRef.current.optimisticUpdate(t.id, { reimbursable: t.reimbursable ? 0 : 1 });
            cbRef.current.patchTransaction(t.id, { reimbursable: !t.reimbursable });
          }}
          className={`shrink-0 rounded p-0.5 transition-colors ${
            t.reimbursable
              ? "text-warning"
              : "text-base-content/20 hover:text-base-content/40"
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          {isEditingField("amount") ? (
            <input
              type="number"
              autoFocus
              step="0.01"
              value={editingValue}
              onChange={(e) =>
                cbRef.current.setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)
              }
              onBlur={() => cbRef.current.commitEdit()}
              onKeyDown={cbRef.current.handleEditKeyDown}
              className={INPUT_CLS + " text-right"}
            />
          ) : (
            <div
              onClick={() => cbRef.current.startEdit(t.id, "amount", String(t.amount))}
              className="cursor-text text-right hover:underline"
              title="Click to edit"
            >
              <span className={`block text-sm font-medium tabular-nums ${t.amount >= 0 ? "text-success" : "text-base-content"}`}>
                {t.account_currency && t.account_currency !== "CHF"
                  ? formatCurrency(t.amount, t.account_currency)
                  : formatCurrency(t.amount)}
              </span>
              {t.account_currency && t.account_currency !== "CHF" && (
                <span className="block text-xs text-base-content/40 tabular-nums">
                  {`\u2248 ${formatCurrency(t.amount * t.exchange_rate, "CHF")}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Isolated popover — has its own state so opening never re-renders the parent ──────────────

type CatPortalHandle = { open: (t: NonNullable<CatPopoverTarget>) => void; close: () => void };

const CategoryPopoverPortal = memo(function CategoryPopoverPortal({
  handleRef,
  sections,
  accounts,
  cbRef,
}: {
  handleRef: React.MutableRefObject<CatPortalHandle | null>;
  sections: Section[];
  accounts: Account[];
  cbRef: { current: RowCallbacks };
}) {
  const [target, setTarget] = useState<CatPopoverTarget>(null);
  handleRef.current = { open: setTarget, close: () => setTarget(null) };

  // Close on scroll since fixed position becomes stale
  useEffect(() => {
    if (!target) return;
    const onScroll = () => setTarget(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [target]);

  if (!target) return null;

  // Flip above if less than 300px of space below the click target
  const spaceBelow = window.innerHeight - target.rect.bottom;
  const top = spaceBelow < 300
    ? Math.max(4, target.rect.top - 300)
    : target.rect.bottom + 4;

  return (
    <div className="fixed z-50" style={{ top, left: target.rect.left }}>
      <SetCategoryPopover
        direction="down"
        sections={sections}
        transferAccounts={accounts}
        onSelect={(cat) => {
          setTarget(null);
          const { transactions, setRecatDialog, optimisticUpdate, patchTransaction } = cbRef.current;
          if (target.needs_review && target.category) {
            const matches = transactions.filter(
              (tx) => tx.needs_review && tx.category === target.category
            );
            if (matches.length > 1) {
              setRecatDialog({
                originalCat: target.category,
                newCat: cat,
                transactionId: target.id,
                matchIds: matches.map((tx) => tx.id),
              });
              return;
            }
          }
          optimisticUpdate(target.id, { category: cat, needs_review: 0 });
          patchTransaction(target.id, { category: cat });
        }}
        onClose={() => setTarget(null)}
      />
    </div>
  );
});

// ── Virtualized transaction list — only renders visible rows ──────────────────

const ROW_HEIGHT = 45;

const VirtualTransactionList = memo(function VirtualTransactionList({
  transactions,
  editing,
  selected,
  accounts,
  categoryPaths,
  cbRef,
}: {
  transactions: Transaction[];
  editing: EditState;
  selected: Set<number>;
  accounts: Account[];
  categoryPaths: Map<string, string>;
  cbRef: { current: RowCallbacks };
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: transactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vRow) => {
          const t = transactions[vRow.index];
          return (
            <div
              key={t.id}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              className="border-b border-base-300"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vRow.start}px)`,
              }}
            >
              <TransactionRow
                t={t}
                isEditing={editing !== null && editing.id === t.id}
                editingField={editing?.id === t.id ? editing.field : null}
                editingValue={editing?.id === t.id ? editing.value : ""}
                isSelected={selected.has(t.id)}
                accounts={accounts}
                categoryPaths={categoryPaths}
                cbRef={cbRef}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ── Filter predicate — mirrors the API's WHERE conditions exactly ─────────────

function matchesFilters(t: Transaction, f: Filters): boolean {
  if (f.search     && !t.description.toLowerCase().includes(f.search.toLowerCase())) return false;
  if (f.from       && t.date < f.from)                   return false;
  if (f.to         && t.date > f.to)                     return false;
  if (f.account    && t.account_id !== Number(f.account)) return false;
  if (f.category   && t.category !== f.category)         return false;
  if (f.minAmount  && t.amount < Number(f.minAmount))    return false;
  if (f.maxAmount  && t.amount > Number(f.maxAmount))    return false;
  if (f.needsReview  && t.category && t.needs_review !== 1) return false;
  if (f.reimbursable && t.reimbursable !== 1)            return false;
  return true;
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
  const [sort, setSort]                 = useState<SortState>({ field: "date", dir: "desc" });
  const [categoryPaths, setCategoryPaths] = useState<Map<string, string>>(new Map());
  const [popoverSections, setPopoverSections] = useState<Section[]>([]);
  const [recatDialog, setRecatDialog] = useState<RecatDialog | null>(null);
  const [latestImport, setLatestImport] = useState<LatestImport>(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const catPortalRef = useRef<CatPortalHandle>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const uncategorisedCount = transactions.filter((t) => !t.category || t.needs_review).length;
  const allSelected  = transactions.length > 0 && selected.size === transactions.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedTxs  = transactions.filter((t) => selected.has(t.id));
  const canLink      = selected.size === 2 && selectedTxs.every((t) => t.linked_transaction_id === null);
  const canUnlink    = selected.size === 1 && selectedTxs[0]?.linked_transaction_id !== null;

  const fetchTransactions = useCallback(async (f: Filters, s: SortState, silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams();
    if (f.search)      params.set("search",     f.search);
    if (f.from)        params.set("from",        f.from);
    if (f.to)          params.set("to",          f.to);
    if (f.account)     params.set("accountId",   f.account);
    if (f.category)    params.set("category",    f.category);
    if (f.minAmount)   params.set("minAmount",   f.minAmount);
    if (f.maxAmount)   params.set("maxAmount",   f.maxAmount);
    if (f.needsReview)  params.set("needsReview",  "true");
    if (f.reimbursable) params.set("reimbursable", "true");
    params.set("sort", s.field);
    params.set("dir",  s.dir);

    const res  = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setSelected(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(Array.isArray(data) ? data.map((a: Record<string, unknown>) => ({
        id: a.id as number, name: a.name as string, color: (a.color as string) ?? null,
        currency: (a.currency as string) ?? "CHF", exchange_rate: (a.exchange_rate as number) ?? 1.0,
      })) : []);
    });
    fetch("/api/transactions/categories").then((r) => r.json()).then((data: string[]) => {
      setCategories(Array.isArray(data) ? data : []);
    });
    fetch("/api/categories").then((r) => r.json()).then((data: FlatCat[]) => {
      setCategoryPaths(buildCategoryPathMap(data));
      setPopoverSections(buildSections(data));
    });
    fetch("/api/imports").then((r) => r.json()).then(setLatestImport);
  }, []);

  useEffect(() => { fetchTransactions(filters, sort); }, [filters, sort, fetchTransactions]);

  function refresh() { fetchTransactions(filters, sort, true); }

  function handleSort(field: SortState["field"]) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  }

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

  // ── Inline editing ─────────────────────────────────────────────────────────

  function startEdit(id: number, field: NonNullable<EditState>["field"], value: string) {
    const e = editing;
    if (e !== null && (e.id !== id || e.field !== field)) {
      void commitEdit();
    }
    setEditing({ id, field, value, original: value });
  }

  async function commitEdit(overrideValue?: string) {
    const e = editing;
    if (e === null) return;
    const { id, field, original } = e;
    const value = overrideValue ?? e.value;
    setEditing(null);
    if (value === original) return;

    // Optimistic local update — no network wait
    const changes: Partial<Transaction> = {};
    if (field === "date")             changes.date = value;
    else if (field === "description") changes.description = value;
    else if (field === "amount")      changes.amount = Number(value);
    optimisticUpdate(id, changes);

    const body: Record<string, string | number> = {};
    if (field === "account")     body.account_id = Number(value);
    else if (field === "amount") body.amount     = Number(value);
    else                         body[field]     = value;

    fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => refresh());
  }

  function cancelEdit() { setEditing(null); }

  function optimisticUpdate(id: number, changes: Partial<Transaction>) {
    setTransactions(prev =>
      prev.map(t => t.id === id ? { ...t, ...changes } : t).filter(t => matchesFilters(t, filters))
    );
  }

  function patchTransaction(id: number, body: Record<string, unknown>) {
    fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => refresh());
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); commitEdit(); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
  }

  function openCategoryPopover(id: number, category: string, needsReview: number, rect: DOMRect) {
    // Commit any pending inline edit first
    if (editing !== null) void commitEdit();
    // Open via ref — triggers state change only in the portal component, not the parent
    catPortalRef.current?.open({ id, category, needs_review: needsReview, rect });
  }

  // Stable ref for row callbacks — rows read cbRef.current at call time, never go stale
  const cbRef = useRef<RowCallbacks>(null!);
  cbRef.current = {
    startEdit,
    setEditing,
    commitEdit,
    cancelEdit,
    handleEditKeyDown,
    toggleOne,
    refresh,
    setRecatDialog,
    transactions,
    optimisticUpdate,
    patchTransaction,
    openCategoryPopover,
  };

  // ── Bulk actions ───────────────────────────────────────────────────────────

  function handleRecatDialog(all: boolean) {
    if (!recatDialog) return;
    const { newCat, transactionId, matchIds } = recatDialog;
    setRecatDialog(null);
    if (all) {
      const idSet = new Set(matchIds);
      setTransactions(prev => prev.map(t => idSet.has(t.id) ? { ...t, category: newCat, needs_review: 0 } : t).filter(t => matchesFilters(t, filters)));
      fetch("/api/transactions/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: matchIds, category: newCat }),
      }).catch(() => refresh());
    } else {
      optimisticUpdate(transactionId, { category: newCat, needs_review: 0 });
      patchTransaction(transactionId, { category: newCat });
    }
  }

  async function handleUndoImport() {
    if (!latestImport) return;
    await fetch(`/api/imports?id=${latestImport.id}`, { method: "DELETE" });
    setLatestImport(null);
    setShowUndoConfirm(false);
    refresh();
  }

  function handleMarkAllReimbursable() {
    const ids = transactions.map((t) => t.id);
    if (ids.length === 0) return;
    setTransactions(prev => prev.map(t => ({ ...t, reimbursable: 1 })));
    fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, reimbursable: true }),
    }).catch(() => refresh());
  }

  function handleSetCategory(category: string) {
    setShowCatPopover(false);
    const ids = new Set(selected);
    setTransactions(prev => prev.map(t => ids.has(t.id) ? { ...t, category, needs_review: 0 } : t).filter(t => matchesFilters(t, filters)));
    setSelected(new Set());
    fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...ids], category }),
    }).catch(() => refresh());
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

  function handleBulkDelete() {
    const ids = new Set(selected);
    setTransactions(prev => prev.filter(t => !ids.has(t.id)));
    setSelected(new Set());
    fetch("/api/transactions/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...ids] }),
    }).catch(() => refresh());
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-base-300 bg-base-100 px-8 py-4">
        <h1 className="text-xl font-semibold text-base-content">Transactions</h1>
        <div className="flex items-center gap-2">
          {latestImport && (
            <button
              onClick={() => setShowUndoConfirm(true)}
              className="btn btn-ghost btn-sm text-error"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7v6h6" /><path d="M3 13C5 7 10 3 16 3a9 9 0 0 1 0 18H3" />
              </svg>
              Undo import
            </button>
          )}
          <button onClick={() => setShowAdd(true)} className="btn btn-outline btn-sm w-40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add transaction
          </button>
          <button onClick={() => setShowImport(true)} className="btn btn-primary btn-sm w-40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-8">
        {/* Review banner */}
        {uncategorisedCount > 0 && (
          <div className="alert alert-warning flex items-center justify-between">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-sm font-semibold">Some transactions need review</p>
                <p className="mt-0.5 text-sm">
                  {uncategorisedCount} transaction{uncategorisedCount !== 1 ? "s" : ""} need categorization
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilters((f) => ({ ...f, needsReview: !f.needsReview }))}
              className={`shrink-0 btn btn-sm ${filters.needsReview ? "btn-warning" : "btn-ghost"}`}
            >
              {filters.needsReview ? "Show all" : "Show reviewable"}
            </button>
          </div>
        )}

        {/* Filters */}
        <TransactionFilters filters={filters} accounts={accounts} categories={categories} onChange={setFilters} />

        {/* Batch actions toolbar */}
        {!loading && transactions.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-base-content/50">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={handleMarkAllReimbursable}
              className="btn btn-ghost btn-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Mark all {transactions.length} as owed by parents
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-base-300 bg-base-100">
          {/* Header */}
          <div className="grid grid-cols-[2.5rem_5.5rem_2fr_1fr_1.5fr_1fr] items-center border-b border-base-300 px-5 py-3">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              className="checkbox checkbox-sm"
            />
            {COLUMNS.map((col) => (
              <button
                key={col.field}
                onClick={() => handleSort(col.field)}
                className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${col.field === "amount" ? "justify-end" : ""} ${sort.field === col.field ? "text-base-content" : "text-base-content/50"}`}
              >
                {col.label}
                <span className="text-sm">
                  {sort.field === col.field ? (sort.dir === "asc" ? "↑" : "↓") : ""}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-base-content/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <p className="text-sm font-medium text-base-content/50">No transactions found</p>
              <p className="text-xs text-base-content/30">Try adjusting your filters or import a bank export</p>
            </div>
          ) : (
            <VirtualTransactionList
              transactions={transactions}
              editing={editing}
              selected={selected}
              accounts={accounts}
              categoryPaths={categoryPaths}
              cbRef={cbRef}
            />
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div ref={barRef} className="relative flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-5 py-3 shadow-xl">
            <span className="text-sm font-medium text-base-content whitespace-nowrap">
              {selected.size} transaction{selected.size !== 1 ? "s" : ""} selected
            </span>
            <span className="text-sm text-base-content/50 whitespace-nowrap">
              {formatCurrency(selectedTxs.reduce((sum, t) => sum + t.amount * t.exchange_rate, 0))}
            </span>
            <div className="h-4 w-px bg-base-300" />

            {/* Export */}
            <button
              onClick={() => setShowExport(true)}
              className="btn btn-ghost btn-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            {/* Set category */}
            <div className="relative">
              <button
                onClick={() => setShowCatPopover((v) => !v)}
                disabled={bulkWorking}
                className="btn btn-ghost btn-sm disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Set category
              </button>
              {showCatPopover && (
                <SetCategoryPopover
                  sections={popoverSections}
                  transferAccounts={accounts}
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
                className="btn btn-ghost btn-sm disabled:opacity-50"
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
                className="btn btn-ghost btn-sm disabled:opacity-50"
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
              className="btn btn-ghost btn-sm text-error disabled:opacity-50"
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
            <button onClick={() => setSelected(new Set())} className="ml-1 btn btn-ghost btn-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Isolated category popover — manages its own state, never re-renders parent */}
      <CategoryPopoverPortal
        handleRef={catPortalRef}
        sections={popoverSections}
        accounts={accounts}
        cbRef={cbRef}
      />

      {showAdd    && <AddTransactionModal onClose={() => setShowAdd(false)}    onSaved={refresh} />}
      {showImport && <CsvImportModal      onClose={() => setShowImport(false)} onImported={() => {
        refresh();
        fetch("/api/imports").then((r) => r.json()).then(setLatestImport);
      }} />}
      {showExport && <ExportCsvModal transactions={selectedTxs} onClose={() => setShowExport(false)} />}

      {showUndoConfirm && latestImport && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="text-lg font-bold">Undo import?</h2>
            <p className="py-4 text-sm">
              This will permanently delete{" "}
              <span className="font-medium">{latestImport.count} transactions</span>
              {" "}from{" "}
              <span className="font-medium">{latestImport.account_name}</span>
              {" "}imported from{" "}
              <span className="font-mono text-xs">{latestImport.filename}</span>.
            </p>
            <div className="modal-action">
              <button
                onClick={() => setShowUndoConfirm(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleUndoImport}
                className="btn btn-error"
              >
                Delete {latestImport.count} transactions
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowUndoConfirm(false)}>close</button>
          </form>
        </div>
      )}

      {recatDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="text-lg font-bold">Recategorize all?</h2>
            <p className="py-4 text-sm">
              <span className="font-medium">{recatDialog.matchIds.length} transactions</span>
              {" "}have the unrecognised category{" "}
              <span className="font-mono text-xs font-medium text-error">
                {recatDialog.originalCat}
              </span>
              . Do you want to recategorize all of them?
            </p>
            <div className="modal-action">
              <button
                onClick={() => handleRecatDialog(false)}
                className="btn btn-ghost"
              >
                Just this one
              </button>
              <button
                onClick={() => handleRecatDialog(true)}
                className="btn btn-primary"
              >
                All {recatDialog.matchIds.length}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setRecatDialog(null)}>close</button>
          </form>
        </div>
      )}
    </div>
  );
}
