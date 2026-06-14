"use client";

import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { CATEGORY_ICON_MAP } from "@/app/components/CategoryModal";
import TagPill from "@/app/components/TagPill";
import { type CategoryDisplay } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";

// Read-only transaction list that mirrors the layout of the main transactions
// overview (app/transactions/page.tsx): a column header, virtualized rows with
// day separators and a daily total. No editing / selection.

export type ListTransaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  reimbursable: number;
  needs_review: number;
  account_name: string;
  account_color: string;
  account_currency: string;
  exchange_rate: number;
  linked_transaction_id: number | null;
};

type Tag = { id: number; name: string; color: string | null; icon: string | null; is_system: number };

const DEFAULT_CAT_COLOR = "#A89080";
const ROW_HEIGHT = 45;
const SEPARATOR_HEIGHT = 32;
const GRID = "grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr] items-center px-5";

type VirtualItem =
  | { kind: "separator"; date: string; total: number }
  | { kind: "row"; tx: ListTransaction };

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

const COLUMNS = ["Description", "Account", "Category", "Tags", "Amount"];

const Row = memo(function Row({ t, categoryDisplayMap, tags }: {
  t: ListTransaction;
  categoryDisplayMap: Map<string, CategoryDisplay>;
  tags: Tag[];
}) {
  const needsReview = !!t.needs_review || !t.category;
  return (
    <div
      style={{ height: ROW_HEIGHT, boxShadow: needsReview ? "inset 3px 0 0 0 #E07B4F" : undefined }}
      className={`${GRID} overflow-hidden transition-colors hover:bg-base-200`}
    >
      {/* Description */}
      <div className="min-w-0 pr-4">
        <div className="flex min-w-0 items-center gap-1.5">
          {t.linked_transaction_id !== null && (
            <span title="Linked transfer" className="shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-base-content/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
          )}
          <span className="block truncate text-sm text-base-content" title={t.description}>
            {t.description}
          </span>
        </div>
      </div>

      {/* Account */}
      <div className="pr-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {t.account_color && (
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.account_color }} />
          )}
          <span className="truncate text-sm text-base-content/50">{t.account_name ?? "—"}</span>
        </div>
      </div>

      {/* Category */}
      <div className="min-w-0 pr-2">
        {t.category ? (() => {
          const display = categoryDisplayMap.get(t.category);
          const leafName = display?.leafName ?? t.category.split(": ").pop() ?? t.category;
          const color = display?.color ?? DEFAULT_CAT_COLOR;
          const Icon = display?.icon ? CATEGORY_ICON_MAP[display.icon] : null;
          return (
            <div
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-1.5 py-0.5"
              style={{ backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
              title={t.category}
            >
              {Icon
                ? <Icon size={11} color={color} strokeWidth={2} className="shrink-0" />
                : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
              <span className="truncate text-xs font-medium" style={{ color }}>{leafName}</span>
            </div>
          );
        })() : (
          <span className="text-xs text-warning">Uncategorised</span>
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
          return <TagPill color={tag?.color ?? "#C49A3C"} icon={tag?.icon ?? null} label={tag?.name ?? "Owed by parents"} />;
        })()}
      </div>

      {/* Amount */}
      <div className="text-right">
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
    </div>
  );
});

const TransactionListReadOnly = memo(function TransactionListReadOnly({
  transactions,
  categoryDisplayMap,
  tags,
}: {
  transactions: ListTransaction[];
  categoryDisplayMap: Map<string, CategoryDisplay>;
  tags: Tag[];
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
    <div className="v2-card flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className={`${GRID} border-b border-base-300 py-3`}>
        {COLUMNS.map((label) => (
          <div
            key={label}
            className={`text-xs font-semibold uppercase tracking-wide text-base-content/50 ${label === "Amount" ? "text-right" : ""}`}
          >
            {label}
          </div>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-base-content/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <p className="text-sm font-medium text-base-content/50">No transactions found</p>
          <p className="text-xs text-base-content/30">Try adjusting your filters</p>
        </div>
      ) : (
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
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>
                        {formatDate(item.date)}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: item.total >= 0 ? "var(--pos)" : "var(--neg)" }}>
                        {item.total >= 0 ? "+" : ""}{formatCurrency(item.total)}
                      </span>
                    </div>
                  ) : (
                    <div className="border-b border-base-300">
                      <Row t={item.tx} categoryDisplayMap={categoryDisplayMap} tags={tags} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default TransactionListReadOnly;
