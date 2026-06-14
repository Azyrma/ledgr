"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";
import TransactionFilters, { DEFAULT_FILTERS, type Filters } from "@/app/components/TransactionFilters";
import TransactionDateFilter from "@/app/components/TransactionDateFilter";
import ExportCsvModal from "@/app/components/ExportCsvModal";
import TransactionListReadOnly from "@/app/components/TransactionListReadOnly";
import { buildSections, type Section } from "@/app/components/SetCategoryPopover";
import { buildCategoryDisplayMap, type CategoryDisplay, type FlatCat } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type AccountRow = { id: number; name: string; color: string | null; currency: string; exchange_rate: number };
type Tag = { id: number; name: string; color: string | null; icon: string | null; is_system: number };

type Breakdown = { key: string; childSeg: string | null; name: string; color: string; amount: number; drillable: boolean };

const FALLBACK_COLOR = "var(--ink-4)";
const PALETTE = [
  "oklch(0.52 0.12 35)", "oklch(0.6 0.13 40)", "oklch(0.65 0.1 50)",
  "oklch(0.62 0.09 270)", "oklch(0.58 0.1 200)", "oklch(0.58 0.12 310)",
  "oklch(0.55 0.08 240)", "oklch(0.52 0.09 155)", "oklch(0.46 0.1 155)",
  "oklch(0.55 0.1 200)", "oklch(0.58 0.08 170)",
];

// ── Donut ─────────────────────────────────────────────────────────────────────

function Donut({
  segments,
  total,
  label,
  size = 260,
  thickness = 28,
}: {
  segments: { value: number; color: string }[];
  total: number;
  label: string;
  size?: number;
  thickness?: number;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  // Precompute each segment's length and cumulative start offset (no render-time mutation).
  const arcs = segments.reduce<{ len: number; offset: number }[]>((acc, s) => {
    const len = total > 0 ? (s.value / total) * circ : 0;
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    acc.push({ len, offset });
    return acc;
  }, []);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} stroke="var(--surface-3)" strokeWidth={thickness} fill="none" />
        {segments.map((s, i) => {
          const { len, offset } = arcs[i];
          const dashOffset = -offset;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          <div className="display-serif" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginTop: 4 }}>
            CHF {Math.round(total).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function Progress({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 5, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 100 }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [tab, setTab] = useState<"spending" | "income">("spending");

  // Drill-down path into the category tree (segments, excluding system roots).
  const [drill, setDrill] = useState<string[]>([]);

  // Filter / date / search state (mirrors the account transaction overview)
  const [filters, setFilters]         = useState<Filters>(DEFAULT_FILTERS);
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo,   setDateTo]         = useState("");
  const [localSearch, setLocalSearch] = useState("");
  const searchTimerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [accounts, setAccounts]         = useState<AccountRow[]>([]);
  const [tags, setTags]                 = useState<Tag[]>([]);
  const [categoryDisplayMap, setCategoryDisplayMap] = useState<Map<string, CategoryDisplay>>(new Map());
  const [, setPopoverSections]          = useState<Section[]>([]);

  // Export
  const [exportTxs, setExportTxs] = useState<Transaction[] | null>(null);

  // ── Static data for filters ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(Array.isArray(data) ? data.map((a: Record<string, unknown>) => ({
        id: a.id as number, name: a.name as string, color: (a.color as string) ?? null,
        currency: (a.currency as string) ?? "CHF", exchange_rate: (a.exchange_rate as number) ?? 1.0,
      })) : []);
    });
    fetch("/api/categories").then((r) => r.json()).then((data: FlatCat[]) => {
      setCategoryDisplayMap(buildCategoryDisplayMap(data));
      setPopoverSections(buildSections(data));
    });
    fetch("/api/tags").then((r) => r.json()).then((data: Tag[]) => {
      setTags(Array.isArray(data) ? data : []);
    });
  }, []);

  // ── Transactions (re-fetched whenever filters / date change) ──────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search)      params.set("search",      filters.search);
      if (dateFrom)            params.set("from",         dateFrom);
      if (dateTo)              params.set("to",           dateTo);
      if (filters.account)     params.set("accountId",    filters.account);
      if (filters.category)    params.set("category",     filters.category);
      if (filters.minAmount)   params.set("minAmount",    filters.minAmount);
      if (filters.maxAmount)   params.set("maxAmount",    filters.maxAmount);
      if (filters.needsReview)  params.set("needsReview",  "true");
      if (filters.reimbursable) params.set("reimbursable", "true");
      if (filters.transfers)    params.set("transfers",    "true");
      params.set("sort", "date");
      params.set("dir", "desc");

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      if (cancelled) return;
      setTransactions(Array.isArray(data) ? data : []);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [filters, dateFrom, dateTo]);

  function handleSearchInput(val: string) {
    setLocalSearch(val);
    clearTimeout(searchTimerRef.current ?? undefined);
    searchTimerRef.current = setTimeout(
      () => setFilters((f) => ({ ...f, search: val })),
      300,
    );
  }

  const activeFilterCount = [
    filters.account, filters.category, filters.minAmount, filters.maxAmount,
    filters.needsReview, filters.reimbursable, filters.transfers,
  ].filter(Boolean).length;

  // ── Tab-scoped subset (spending = expenses, income = income; transfers excluded) ──
  const tabTxs = useMemo(() => transactions.filter((t) => {
    const isTransfer = t.linked_transaction_id !== null || t.category.startsWith("Transfer:");
    if (isTransfer) return false;
    return tab === "spending" ? t.amount < 0 : t.amount > 0;
  }), [transactions, tab]);

  // ── Drill-scoped subset (only categories under the current drill path) ────
  const drillTxs = useMemo(() => tabTxs.filter((t) => {
    if (drill.length === 0) return true;
    const segs = t.category ? t.category.split(": ") : [];
    if (segs.length < drill.length) return false;
    for (let i = 0; i < drill.length; i++) if (segs[i] !== drill[i]) return false;
    return true;
  }), [tabTxs, drill]);

  // ── Aggregate the current level for the donut + breakdown ─────────────────
  const { breakdown, total } = useMemo(() => {
    const depth = drill.length;
    const groups = new Map<string, Breakdown>();
    let palette = 0;
    for (const t of drillTxs) {
      const segs = t.category ? t.category.split(": ") : [];
      let key: string, childSeg: string | null, name: string, childPath: string | null, deeper: boolean;
      if (segs.length === 0) {
        key = "__uncat__"; childSeg = null; name = "Uncategorised"; childPath = null; deeper = false;
      } else if (segs.length <= depth) {
        // Assigned directly to the current node — terminal, not drillable.
        key = t.category; childSeg = null; name = segs[segs.length - 1]; childPath = t.category; deeper = false;
      } else {
        childSeg = segs[depth];
        childPath = [...drill, childSeg].join(": ");
        key = childPath; name = childSeg; deeper = segs.length > depth + 1;
      }
      const amt = Math.abs(t.amount * t.exchange_rate);
      const existing = groups.get(key);
      if (existing) {
        existing.amount += amt;
        existing.drillable = existing.drillable || deeper;
      } else {
        const display = childPath ? categoryDisplayMap.get(childPath) : undefined;
        const color = display?.color ?? (key === "__uncat__" ? FALLBACK_COLOR : PALETTE[palette++ % PALETTE.length]);
        groups.set(key, { key, childSeg, name: display?.leafName ?? name, color, amount: amt, drillable: deeper });
      }
    }
    const rows = [...groups.values()].sort((a, b) => b.amount - a.amount);
    return { breakdown: rows, total: rows.reduce((s, r) => s + r.amount, 0) };
  }, [drillTxs, drill, categoryDisplayMap]);

  const maxAmount = breakdown.length ? breakdown[0].amount : 0;
  const segments = breakdown.map((b) => ({ value: b.amount, color: b.color }));
  const centerLabel = drill.length
    ? drill[drill.length - 1]
    : tab === "spending" ? "Total spent" : "Total earned";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Re" right="ports" />}
        titleExtra={
          <div className="join">
            {(["spending", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setDrill([]); }}
                className={`btn btn-sm join-item capitalize ${tab === t ? "btn-primary" : "btn-outline"}`}
                style={{ minWidth: 110, fontSize: 14 }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        }
        actions={
          <>
            {(activeFilterCount > 0 || localSearch) && (
              <button
                onClick={() => { setFilters(DEFAULT_FILTERS); handleSearchInput(""); }}
                className="btn btn-sm btn-ghost"
                style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}
              >
                Clear all
              </button>
            )}
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: 220 }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", left: 10, pointerEvents: "none", color: "var(--ink-4)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                value={localSearch}
                onChange={(e) => handleSearchInput(e.target.value)}
                style={{
                  width: "100%", height: 40,
                  paddingLeft: 32, paddingRight: localSearch ? 28 : 10,
                  fontSize: 13, borderRadius: 5,
                  border: "1px solid var(--hair-2)",
                  background: "var(--surface)", color: "var(--ink)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--hair-2)")}
              />
              {localSearch && (
                <button
                  onClick={() => handleSearchInput("")}
                  style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 2, display: "flex" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <TransactionFilters
              filters={filters}
              accounts={accounts}
              categoryDisplayMap={categoryDisplayMap}
              tags={tags}
              onChange={setFilters}
              activeFilterCount={activeFilterCount}
            />
            <TransactionDateFilter
              from={dateFrom}
              to={dateTo}
              onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
            />
            <button
              onClick={() => setExportTxs(drillTxs)}
              className="btn btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Transactions
            </button>
          </>
        }
      />

      <div className="flex flex-1 min-h-0 flex-col gap-4 px-9 pb-6 pt-2">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <>
            {/* Donut + category breakdown */}
            <div className="v2-card v2-card-pad">
              {/* Breadcrumb */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                <BreadcrumbItem label={tab === "spending" ? "All spending" : "All income"} active={drill.length === 0} onClick={() => setDrill([])} />
                {drill.map((seg, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "var(--ink-4)" }}>/</span>
                    <BreadcrumbItem label={seg} active={i === drill.length - 1} onClick={() => setDrill(drill.slice(0, i + 1))} />
                  </span>
                ))}
              </div>

              {breakdown.length === 0 ? (
                <div className="muted" style={{ textAlign: "center", padding: "48px 0", fontSize: 14 }}>
                  No {tab === "spending" ? "expenses" : "income"} for the selected filters.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
                  {/* Large donut */}
                  <Donut segments={segments} total={total} label={centerLabel} size={260} thickness={28} />

                  {/* Category list */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    {breakdown.map((c) => {
                      const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
                      return (
                        <div
                          key={c.key}
                          onClick={c.drillable && c.childSeg ? () => setDrill([...drill, c.childSeg!]) : undefined}
                          style={{
                            display: "flex", alignItems: "center", gap: 14, padding: "7px 8px",
                            borderBottom: "1px solid var(--hair)", borderRadius: 6,
                            cursor: c.drillable ? "pointer" : "default",
                            transition: "background 0.1s",
                          }}
                          onMouseEnter={(e) => { if (c.drillable) e.currentTarget.style.background = "var(--surface-2)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          {/* Icon square */}
                          <div style={{
                            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                            background: `${c.color}1c`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <div style={{ width: 11, height: 11, borderRadius: 3, background: c.color }} />
                          </div>

                          {/* Name + bar */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                              <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</span>
                              <span className="muted" style={{ fontSize: 12, marginLeft: 8, flexShrink: 0 }}>{pct}%</span>
                            </div>
                            <Progress value={c.amount} max={maxAmount} color={c.color} />
                          </div>

                          {/* Amount */}
                          <div className="num" style={{ fontSize: 14, fontWeight: 600, minWidth: 100, textAlign: "right", flexShrink: 0 }}>
                            {formatCurrency(c.amount)}
                          </div>

                          {/* Drill chevron */}
                          <div style={{ width: 16, flexShrink: 0, color: "var(--ink-4)", display: "flex", justifyContent: "center" }}>
                            {c.drillable && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Transactions list — same layout as the transactions overview */}
            <div className="flex min-h-0 flex-1 flex-col">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div className="display-serif" style={{ fontSize: 17, color: "var(--ink)" }}>
                  {tab === "spending" ? "Expense" : "Income"}{" "}
                  <span style={{ color: "var(--ink)" }}>transactions</span>
                  {drill.length > 0 && <span className="muted" style={{ fontSize: 13 }}> · {drill.join(": ")}</span>}
                </div>
                <span className="chip" style={{ fontSize: 12 }}>{drillTxs.length} transactions</span>
              </div>
              <TransactionListReadOnly transactions={drillTxs} categoryDisplayMap={categoryDisplayMap} tags={tags} />
            </div>
          </>
        )}
      </div>

      {exportTxs && (
        <ExportCsvModal transactions={exportTxs} onClose={() => setExportTxs(null)} />
      )}
    </div>
  );
}

// ── Breadcrumb item ───────────────────────────────────────────────────────────

function BreadcrumbItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      style={{
        fontSize: 13, fontWeight: active ? 600 : 500,
        color: active ? "var(--ink)" : "var(--brand)",
        background: "none", border: "none", padding: 0,
        cursor: active ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
