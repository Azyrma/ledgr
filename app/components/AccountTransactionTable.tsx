"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ExportCsvModal from "./ExportCsvModal";
import SetCategoryPopover, { type Section } from "./SetCategoryPopover";
import { type Filters } from "./TransactionFilters";
import { formatCurrency } from "@/lib/utils";
import { type CategoryDisplay } from "@/lib/categories";
import { CATEGORY_ICON_MAP } from "./CategoryModal";

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
  balance: number;
};

type Account = { id: number; name: string; color: string | null; currency: string; exchange_rate: number };
type Tag = { id: number; name: string; color: string | null; icon: string | null; is_system: number };

type SortState = {
  field: "date" | "description" | "category" | "amount";
  dir: "asc" | "desc";
};

const COLUMNS: { label: string; field?: SortState["field"] }[] = [
  { label: "Description", field: "description" },
  { label: "Category",    field: "category" },
  { label: "Tags" },
  { label: "Amount",      field: "amount" },
  { label: "Balance" },
];

type EditState = {
  id: number;
  field: "date" | "description" | "category" | "amount";
  value: string;
  original: string;
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

const DEFAULT_CAT_COLOR = "#A89080";
const INPUT_CLS = "w-full input input-bordered input-sm";
const ROW_HEIGHT = 45;
const SEPARATOR_HEIGHT = 32;

function TagPill({ color, icon, label, onClick }: { color: string; icon: string | null; label: string; onClick?: () => void }) {
  const Icon = icon ? CATEGORY_ICON_MAP[icon] : null;
  return (
    <div
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 ${onClick ? "cursor-pointer transition-opacity hover:opacity-70" : ""}`}
      style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
    >
      {Icon
        ? <Icon size={10} color={color} strokeWidth={2} className="shrink-0" />
        : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      }
      <span className="text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

const TransactionRow = memo(function TransactionRow({
  t,
  isEditing,
  editingField,
  editingValue,
  isSelected,
  categoryDisplayMap,
  tags,
  cbRef,
}: {
  t: Transaction;
  isEditing: boolean;
  editingField: NonNullable<EditState>["field"] | null;
  editingValue: string;
  isSelected: boolean;
  categoryDisplayMap: Map<string, CategoryDisplay>;
  tags: Tag[];
  cbRef: { current: RowCallbacks };
}) {
  const isEditingField = (field: NonNullable<EditState>["field"]) => isEditing && editingField === field;

  const needsReview = !!t.needs_review || !t.category;

  return (
    <div
      style={{
        height: ROW_HEIGHT,
        boxShadow: needsReview ? "inset 3px 0 0 0 #E07B4F" : undefined,
      }}
      className={`grid grid-cols-[2.5rem_2fr_1.5fr_1fr_1fr_1fr] items-center overflow-hidden px-5 transition-colors ${
        isSelected ? "bg-base-200" : "hover:bg-base-200"
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => cbRef.current.toggleOne(t.id)}
        className="checkbox checkbox-sm"
      />

      {/* Description */}
      <div className="min-w-0 pr-4">
        {isEditingField("description") ? (
          <input
            type="text"
            autoFocus
            value={editingValue}
            onChange={(e) => cbRef.current.setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
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

      {/* Category */}
      <div className="relative min-w-0 pr-2">
        {t.needs_review && t.category ? (
          <div
            onClick={(e) => cbRef.current.openCategoryPopover(t.id, t.category, t.needs_review, (e.currentTarget as HTMLElement).getBoundingClientRect())}
            className="flex min-w-0 cursor-pointer items-center gap-1.5"
            title={`"${t.category}" was not found in your categories`}
          >
            <span className="truncate text-sm text-error hover:underline">{t.category}</span>
            <span className="badge badge-sm badge-error">not found</span>
          </div>
        ) : t.category ? (() => {
          const display = categoryDisplayMap.get(t.category);
          const leafName = display?.leafName ?? t.category.split(": ").pop() ?? t.category;
          const color = display?.color ?? DEFAULT_CAT_COLOR;
          const Icon = display?.icon ? CATEGORY_ICON_MAP[display.icon] : null;
          return (
            <div
              onClick={(e) => cbRef.current.openCategoryPopover(t.id, t.category, t.needs_review, (e.currentTarget as HTMLElement).getBoundingClientRect())}
              className="inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 transition-opacity hover:opacity-80"
              style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
              title={t.category}
            >
              {Icon
                ? <Icon size={11} color={color} strokeWidth={2} className="shrink-0" />
                : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
              }
              <span className="truncate text-xs font-medium" style={{ color }}>{leafName}</span>
            </div>
          );
        })() : (
          <span
            onClick={(e) => cbRef.current.openCategoryPopover(t.id, t.category, t.needs_review, (e.currentTarget as HTMLElement).getBoundingClientRect())}
            className="cursor-pointer text-xs text-warning hover:underline"
          >
            Uncategorised
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex min-w-0 flex-wrap items-center gap-1 pr-2">
        {(t.linked_transaction_id !== null || t.category?.startsWith("Transfer:")) && (() => {
          const tag = tags.find((tg) => tg.id === 1);
          return <TagPill color={tag?.color ?? "#6B8CAE"} icon={tag?.icon ?? null} label={tag?.name ?? "Transfer"} />;
        })()}
        {!!t.reimbursable && (() => {
          const tag = tags.find((tg) => tg.id === 2);
          return (
            <TagPill
              color={tag?.color ?? "#C49A3C"}
              icon={tag?.icon ?? null}
              label={tag?.name ?? "Owed by parents"}
              onClick={() => {
                cbRef.current.optimisticUpdate(t.id, { reimbursable: 0 });
                cbRef.current.patchTransaction(t.id, { reimbursable: false });
              }}
            />
          );
        })()}
      </div>

      {/* Amount */}
      <div className="flex items-center pr-4">
        <div className="min-w-0 flex-1">
          {isEditingField("amount") ? (
            <input
              type="number"
              autoFocus
              step="0.01"
              value={editingValue}
              onChange={(e) => cbRef.current.setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
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
                  {`≈ ${formatCurrency(t.amount * t.exchange_rate, "CHF")}`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Balance */}
      <div className="text-right text-sm tabular-nums text-base-content/70">
        {formatCurrency(t.balance, t.account_currency || "CHF")}
      </div>
    </div>
  );
});

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
  const popoverRef = useRef<HTMLDivElement>(null);
  handleRef.current = { open: setTarget, close: () => setTarget(null) };

  useEffect(() => {
    if (!target) return;
    const onScroll = (e: Event) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      setTarget(null);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [target]);

  if (!target) return null;

  const spaceBelow = window.innerHeight - target.rect.bottom;
  const top = spaceBelow < 300 ? Math.max(4, target.rect.top - 300) : target.rect.bottom + 4;

  return (
    <div ref={popoverRef} className="fixed z-50" style={{ top, left: target.rect.left }}>
      <SetCategoryPopover
        direction="down"
        sections={sections}
        transferAccounts={accounts}
        onSelect={(cat) => {
          setTarget(null);
          const { transactions, setRecatDialog, optimisticUpdate, patchTransaction } = cbRef.current;
          if (target.needs_review && target.category) {
            const matches = transactions.filter((tx) => tx.needs_review && tx.category === target.category);
            if (matches.length > 1) {
              setRecatDialog({ originalCat: target.category, newCat: cat, transactionId: target.id, matchIds: matches.map((tx) => tx.id) });
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

type VirtualItem =
  | { kind: "separator"; date: string; total: number }
  | { kind: "row"; tx: Transaction };

const VirtualTransactionList = memo(function VirtualTransactionList({
  transactions,
  editing,
  selected,
  categoryDisplayMap,
  tags,
  cbRef,
}: {
  transactions: Transaction[];
  editing: EditState;
  selected: Set<number>;
  categoryDisplayMap: Map<string, CategoryDisplay>;
  tags: Tag[];
  cbRef: { current: RowCallbacks };
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const items = useMemo<VirtualItem[]>(() => {
    const dailyTotals = new Map<string, number>();
    for (const tx of transactions) {
      dailyTotals.set(tx.date, (dailyTotals.get(tx.date) ?? 0) + tx.amount * tx.exchange_rate);
    }
    const result: VirtualItem[] = [];
    let lastDate = "";
    for (const tx of transactions) {
      if (tx.date !== lastDate) {
        result.push({ kind: "separator", date: tx.date, total: dailyTotals.get(tx.date) ?? 0 });
        lastDate = tx.date;
      }
      result.push({ kind: "row", tx });
    }
    return result;
  }, [transactions]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => items[i].kind === "separator" ? SEPARATOR_HEIGHT : ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vRow) => {
          const item = items[vRow.index];
          return (
            <div
              key={vRow.index}
              data-index={vRow.index}
              ref={virtualizer.measureElement}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${vRow.start}px)` }}
            >
              {item.kind === "separator" ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: SEPARATOR_HEIGHT, background: "var(--surface-2)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>{formatDate(item.date)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: item.total >= 0 ? "var(--pos)" : "var(--neg)" }}>
                    {item.total >= 0 ? "+" : ""}{formatCurrency(item.total)}
                  </span>
                </div>
              ) : (
                <div className="border-b border-base-300">
                  <TransactionRow
                    t={item.tx}
                    isEditing={editing !== null && editing.id === item.tx.id}
                    editingField={editing?.id === item.tx.id ? editing.field : null}
                    editingValue={editing?.id === item.tx.id ? editing.value : ""}
                    isSelected={selected.has(item.tx.id)}
                    categoryDisplayMap={categoryDisplayMap}
                    tags={tags}
                    cbRef={cbRef}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

type Props = {
  accountId: number;
  from?: string;
  to?: string;
  filters: Filters;
  accounts: Account[];
  categoryDisplayMap: Map<string, CategoryDisplay>;
  tags: Tag[];
  popoverSections: Section[];
};

export default function AccountTransactionTable({ accountId, from = "", to = "", filters, accounts, categoryDisplayMap, tags, popoverSections }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Set<number>>(new Set());
  const [showCatPopover, setShowCatPopover] = useState(false);
  const [bulkWorking, setBulkWorking]   = useState(false);
  const [editing, setEditing]           = useState<EditState>(null);
  const [sort, setSort]                 = useState<SortState>({ field: "date", dir: "desc" });
  const [recatDialog, setRecatDialog]   = useState<RecatDialog | null>(null);
  const [showExport, setShowExport]     = useState(false);
  const catPortalRef = useRef<CatPortalHandle>(null);

  const allSelected  = transactions.length > 0 && selected.size === transactions.length;
  const someSelected = selected.size > 0 && !allSelected;
  const selectedTxs  = transactions.filter((t) => selected.has(t.id));
  const canLink      = selected.size === 2 && selectedTxs.every((t) => t.linked_transaction_id === null);
  const canUnlink    = selected.size === 1 && selectedTxs[0]?.linked_transaction_id !== null;

  const fetchTransactions = useCallback(async (s: SortState, silent = false) => {
    if (!silent) setLoading(true);
    const params = new URLSearchParams({ accountId: String(accountId), sort: s.field, dir: s.dir });
    if (from) params.set("from", from);
    if (to)   params.set("to",   to);
    if (filters.search)      params.set("search",      filters.search);
    if (filters.category)    params.set("category",    filters.category);
    if (filters.minAmount)   params.set("minAmount",   filters.minAmount);
    if (filters.maxAmount)   params.set("maxAmount",   filters.maxAmount);
    if (filters.needsReview)  params.set("needsReview",  "true");
    if (filters.reimbursable) params.set("reimbursable", "true");
    if (filters.transfers)    params.set("transfers",    "true");
    const res  = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
    setSelected(new Set());
    setLoading(false);
  }, [accountId, from, to, filters]);


  useEffect(() => { fetchTransactions(sort); }, [sort, from, to, fetchTransactions]);

  function refresh() { fetchTransactions(sort, true); }

  const DEFAULT_SORT: SortState = { field: "date", dir: "desc" };

  function handleSort(field: SortState["field"]) {
    setSort((prev) => {
      if (prev.field !== field) return { field, dir: "asc" };
      if (prev.dir === "asc") return { field, dir: "desc" };
      return DEFAULT_SORT;
    });
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

  function startEdit(id: number, field: NonNullable<EditState>["field"], value: string) {
    if (editing !== null && (editing.id !== id || editing.field !== field)) void commitEdit();
    setEditing({ id, field, value, original: value });
  }

  async function commitEdit(overrideValue?: string) {
    const e = editing;
    if (e === null) return;
    const { id, field, original } = e;
    const value = overrideValue ?? e.value;
    setEditing(null);
    if (value === original) return;

    const changes: Partial<Transaction> = {};
    if (field === "description") changes.description = value;
    else if (field === "amount") changes.amount = Number(value);
    optimisticUpdate(id, changes);

    const body: Record<string, string | number> = {};
    if (field === "amount") body.amount = Number(value);
    else                    body[field] = value;

    fetch(`/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => refresh());
  }

  function cancelEdit() { setEditing(null); }

  function optimisticUpdate(id: number, changes: Partial<Transaction>) {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, ...changes } : t));
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
    if (editing !== null) void commitEdit();
    catPortalRef.current?.open({ id, category, needs_review: needsReview, rect });
  }

  const cbRef = useRef<RowCallbacks>(null!);
  cbRef.current = {
    startEdit, setEditing, commitEdit, cancelEdit, handleEditKeyDown,
    toggleOne, refresh, setRecatDialog, transactions,
    optimisticUpdate, patchTransaction, openCategoryPopover,
  };

  function handleRecatDialog(all: boolean) {
    if (!recatDialog) return;
    const { newCat, transactionId, matchIds } = recatDialog;
    setRecatDialog(null);
    if (all) {
      const idSet = new Set(matchIds);
      setTransactions((prev) => prev.map((t) => idSet.has(t.id) ? { ...t, category: newCat, needs_review: 0 } : t));
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

  function handleSetCategory(category: string) {
    setShowCatPopover(false);
    const ids = new Set(selected);
    setTransactions((prev) => prev.map((t) => ids.has(t.id) ? { ...t, category, needs_review: 0 } : t));
    setSelected(new Set());
    fetch("/api/transactions/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...ids], category }),
    }).catch(() => refresh());
  }

  async function handleLink() {
    setBulkWorking(true);
    await fetch("/api/transactions/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [...selected] }) });
    setBulkWorking(false);
    refresh();
  }

  async function handleUnlink() {
    setBulkWorking(true);
    await fetch("/api/transactions/link", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: [...selected][0] }) });
    setBulkWorking(false);
    refresh();
  }

  function handleBulkDelete() {
    const ids = new Set(selected);
    setTransactions((prev) => prev.filter((t) => !ids.has(t.id)));
    setSelected(new Set());
    fetch("/api/transactions/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...ids] }),
    }).catch(() => refresh());
  }

  return (
    <div className="v2-card flex min-h-0 flex-1 flex-col">
      {/* Table header */}
      <div className="grid grid-cols-[2.5rem_2fr_1.5fr_1fr_1fr_1fr] items-center border-b border-base-300 px-5 py-3">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected; }}
          onChange={toggleAll}
          className="checkbox checkbox-sm"
        />
        {COLUMNS.map((col) => (
          col.field ? (
            <button
              key={col.label}
              onClick={() => handleSort(col.field!)}
              className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${col.field === "amount" ? "justify-end" : ""} ${sort.field === col.field ? "text-base-content" : "text-base-content/50"}`}
            >
              {col.label}
              <span className="text-sm">{sort.field === col.field ? (sort.dir === "asc" ? "↑" : "↓") : ""}</span>
            </button>
          ) : (
            <div key={col.label} className={`text-xs font-semibold uppercase tracking-wide text-base-content/50 ${col.label === "Balance" ? "text-right" : ""}`}>
              {col.label}
            </div>
          )
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
          <p className="text-sm font-medium text-base-content/50">No transactions</p>
        </div>
      ) : (
        <VirtualTransactionList
          transactions={transactions}
          editing={editing}
          selected={selected}
          categoryDisplayMap={categoryDisplayMap}
          tags={tags}
          cbRef={cbRef}
        />
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="relative flex items-center gap-3 rounded-xl border border-base-300 bg-base-100 px-5 py-3 shadow-xl">
            <span className="text-sm font-medium text-base-content whitespace-nowrap">
              {selected.size} transaction{selected.size !== 1 ? "s" : ""} selected
            </span>
            <span className="text-sm text-base-content/50 whitespace-nowrap">
              {formatCurrency(selectedTxs.reduce((sum, t) => sum + t.amount * t.exchange_rate, 0))}
            </span>
            <div className="h-4 w-px bg-base-300" />

            <button onClick={() => setShowExport(true)} className="btn btn-ghost btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>

            <div className="relative">
              <button onClick={() => setShowCatPopover((v) => !v)} disabled={bulkWorking} className="btn btn-ghost btn-sm disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                Set category
              </button>
              {showCatPopover && (
                <SetCategoryPopover sections={popoverSections} transferAccounts={accounts} onSelect={handleSetCategory} onClose={() => setShowCatPopover(false)} />
              )}
            </div>

            {canLink && (
              <button onClick={handleLink} disabled={bulkWorking} className="btn btn-ghost btn-sm disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Link as transfer
              </button>
            )}

            {canUnlink && (
              <button onClick={handleUnlink} disabled={bulkWorking} className="btn btn-ghost btn-sm disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
                Unlink transfer
              </button>
            )}

            <button onClick={handleBulkDelete} disabled={bulkWorking} className="btn btn-ghost btn-sm text-error disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete
            </button>

            <button onClick={() => setSelected(new Set())} className="ml-1 btn btn-ghost btn-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <CategoryPopoverPortal handleRef={catPortalRef} sections={popoverSections} accounts={accounts} cbRef={cbRef} />

      {showExport && <ExportCsvModal transactions={selectedTxs} onClose={() => setShowExport(false)} />}

      {recatDialog && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h2 className="text-lg font-bold">Recategorize all?</h2>
            <p className="py-4 text-sm">
              <span className="font-medium">{recatDialog.matchIds.length} transactions</span>
              {" "}have the unrecognised category{" "}
              <span className="font-mono text-xs font-medium text-error">{recatDialog.originalCat}</span>
              . Do you want to recategorize all of them?
            </p>
            <div className="modal-action">
              <button onClick={() => handleRecatDialog(false)} className="btn btn-ghost">Just this one</button>
              <button onClick={() => handleRecatDialog(true)} className="btn btn-primary">All {recatDialog.matchIds.length}</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setRecatDialog(null)}>close</button></form>
        </div>
      )}
    </div>
  );
}
