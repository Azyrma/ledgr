"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORY_ICON_MAP } from "@/app/components/CategoryModal";
import type { CategoryDisplay } from "@/lib/categories";

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

type Account = { id: number; name: string; color: string | null };
type Tag = { id: number; name: string; color: string | null; icon: string | null; is_system: number };

const DEFAULT_CAT_COLOR = "#A89080";

// System tag IDs map to filter keys
const SYSTEM_TAG_FILTER_KEY: Record<number, keyof Filters> = {
  1: "transfers",
  2: "reimbursable",
};

type Props = {
  filters: Filters;
  accounts: Account[];
  categoryDisplayMap: Map<string, CategoryDisplay>;
  tags: Tag[];
  onChange: (filters: Filters) => void;
  activeFilterCount: number;
  hideTabs?: Tab[];
};

export type Tab = "category" | "account" | "amount" | "tags";

const TABS: { id: Tab; label: string }[] = [
  { id: "category", label: "Category" },
  { id: "account",  label: "Account"  },
  { id: "amount",   label: "Amount"   },
  { id: "tags",     label: "Tags"     },
];

function tabHasActive(tab: Tab, filters: Filters): boolean {
  if (tab === "category")  return !!filters.category;
  if (tab === "account")   return !!filters.account;
  if (tab === "amount")    return !!(filters.minAmount || filters.maxAmount);
  if (tab === "tags")      return filters.reimbursable || filters.transfers;
  return false;
}

export default function TransactionFilters({ filters, accounts, categoryDisplayMap, tags, onChange, activeFilterCount, hideTabs }: Props) {
  const visibleTabs = hideTabs ? TABS.filter((t) => !hideTabs.includes(t.id)) : TABS;
  const [open, setOpen]     = useState(false);
  const [tab, setTab]       = useState<Tab>(() => visibleTabs[0]?.id ?? "category");
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Reset panel search when switching tabs
  useEffect(() => { setSearch(""); }, [tab]);

  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onChange({ ...filters, [key]: value });
  }

  // Build grouped category list: only leaf nodes, grouped by parent path
  type CatEntry = { path: string; display: CategoryDisplay };
  type CatGroup = { group: string; items: CatEntry[] };

  const allPaths = Array.from(categoryDisplayMap.keys());
  const catGroups: CatGroup[] = [];
  const groupMap = new Map<string, CatEntry[]>();
  categoryDisplayMap.forEach((display, path) => {
    // Skip non-leaf nodes (paths that are a prefix of another path)
    if (allPaths.some((other) => other.startsWith(path + ": "))) return;
    const parts = path.split(": ");
    const group = parts.length > 1 ? parts.slice(0, -1).join(": ") : "";
    if (!groupMap.has(group)) groupMap.set(group, []);
    groupMap.get(group)!.push({ path, display });
  });
  groupMap.forEach((items, group) => catGroups.push({ group, items }));
  catGroups.sort((a, b) => a.group.localeCompare(b.group));

  const lowerSearch = search.toLowerCase();
  const filteredGroups: CatGroup[] = catGroups
    .map(({ group, items }) => ({
      group,
      items: items.filter(
        ({ path, display }) =>
          display.leafName.toLowerCase().includes(lowerSearch) ||
          path.toLowerCase().includes(lowerSearch)
      ),
    }))
    .filter(({ items }) => items.length > 0);

  const filteredAccounts = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  const filterableTags = tags.filter((t) => t.id in SYSTEM_TAG_FILTER_KEY);
  const filteredTags = filterableTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`btn btn-sm relative ${open || activeFilterCount > 0 ? "btn-neutral" : "btn-outline"}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        Filter
        {activeFilterCount > 0 && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 80,
          background: "var(--surface)", border: "1px solid var(--hair)",
          borderRadius: 12, boxShadow: "var(--shadow-3)",
          display: "flex", minWidth: 400, minHeight: 260,
        }}>
          {/* Left nav */}
          <div style={{ padding: 6, borderRight: "1px solid var(--hair)", minWidth: 130 }}>
            {visibleTabs.map((t) => {
              const active = tabHasActive(t.id, filters);
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", textAlign: "left",
                    padding: "7px 10px", borderRadius: 6, fontSize: 13,
                    color: selected ? "var(--brand)" : "var(--ink-2)",
                    background: selected ? "var(--brand-soft)" : "transparent",
                    fontWeight: selected ? 600 : 400,
                    gap: 6,
                  }}
                  onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  {t.label}
                  {active && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: "var(--brand)", flexShrink: 0,
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right panel */}
          <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
            {/* Search bar */}
            {tab !== "amount" && (
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", left: 8, pointerEvents: "none", color: "var(--ink-4)" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%", height: 32, paddingLeft: 28, paddingRight: 8,
                    fontSize: 12, borderRadius: 5,
                    border: "1px solid var(--hair-2)",
                    background: "var(--surface)", color: "var(--ink)", outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                  onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--hair-2)")}
                />
              </div>
            )}

            {/* Category panel */}
            {tab === "category" && (
              <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: 220 }}>
                {filteredGroups.map(({ group, items }) => (
                  <div key={group}>
                    {group && (
                      <div style={{
                        padding: "6px 8px 3px",
                        fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
                        textTransform: "uppercase", color: "var(--ink-4)",
                      }}>
                        {group}
                      </div>
                    )}
                    {items.map(({ path, display }) => {
                      const selected = filters.category === path;
                      const color = display.color ?? DEFAULT_CAT_COLOR;
                      const Icon = display.icon ? CATEGORY_ICON_MAP[display.icon] : null;
                      return (
                        <button
                          key={path}
                          onClick={() => set("category", selected ? "" : path)}
                          style={{
                            display: "flex", alignItems: "center", gap: 7,
                            width: "100%", textAlign: "left",
                            padding: "5px 8px", borderRadius: 5, fontSize: 13,
                            background: selected ? "var(--brand-soft)" : "transparent",
                          }}
                          onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                          onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                            backgroundColor: `${color}22`, border: `1px solid ${color}55`,
                          }}>
                            {Icon
                              ? <Icon size={11} color={color} strokeWidth={2} />
                              : <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
                            }
                          </span>
                          <span style={{ color: selected ? "var(--brand)" : "var(--ink-2)", fontWeight: selected ? 600 : 400 }}>
                            {display.leafName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {filteredGroups.length === 0 && search && (
                  <div style={{ padding: "6px 8px", fontSize: 12, color: "var(--ink-4)" }}>No matches</div>
                )}
              </div>
            )}

            {/* Account panel */}
            {tab === "account" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 200 }}>
                <button
                  onClick={() => set("account", "")}
                  style={{
                    textAlign: "left", padding: "6px 8px", borderRadius: 5, fontSize: 13,
                    color: !filters.account ? "var(--brand)" : "var(--ink-2)",
                    background: !filters.account ? "var(--brand-soft)" : "transparent",
                    fontWeight: !filters.account ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (filters.account) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                  onMouseLeave={(e) => { if (filters.account) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  All accounts
                </button>
                {filteredAccounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => set("account", filters.account === String(a.id) ? "" : String(a.id))}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      textAlign: "left", padding: "6px 8px", borderRadius: 5, fontSize: 13,
                      color: filters.account === String(a.id) ? "var(--brand)" : "var(--ink-2)",
                      background: filters.account === String(a.id) ? "var(--brand-soft)" : "transparent",
                      fontWeight: filters.account === String(a.id) ? 600 : 400,
                    }}
                    onMouseEnter={(e) => { if (filters.account !== String(a.id)) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                    onMouseLeave={(e) => { if (filters.account !== String(a.id)) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.color ?? "var(--ink-4)", flexShrink: 0 }} />
                    {a.name}
                  </button>
                ))}
                {filteredAccounts.length === 0 && search && (
                  <div style={{ padding: "6px 8px", fontSize: 12, color: "var(--ink-4)" }}>No matches</div>
                )}
              </div>
            )}

            {/* Amount panel */}
            {tab === "amount" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 0" }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Min amount</div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.minAmount}
                    onChange={(e) => set("minAmount", e.target.value)}
                    style={{
                      width: "100%", padding: "6px 8px", fontSize: 13,
                      border: "1px solid var(--hair-2)", borderRadius: 5,
                      background: "var(--surface)", color: "var(--ink)", outline: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--hair-2)")}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 5 }}>Max amount</div>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={filters.maxAmount}
                    onChange={(e) => set("maxAmount", e.target.value)}
                    style={{
                      width: "100%", padding: "6px 8px", fontSize: 13,
                      border: "1px solid var(--hair-2)", borderRadius: 5,
                      background: "var(--surface)", color: "var(--ink)", outline: "none",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                    onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--hair-2)")}
                  />
                </div>
              </div>
            )}

            {/* Tags panel */}
            {tab === "tags" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {filteredTags.map((t) => {
                  const filterKey = SYSTEM_TAG_FILTER_KEY[t.id];
                  const checked = !!filters[filterKey];
                  const color = t.color ?? DEFAULT_CAT_COLOR;
                  const Icon = t.icon ? CATEGORY_ICON_MAP[t.icon] : null;
                  return (
                    <button
                      key={t.id}
                      onClick={() => set(filterKey, !checked)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        textAlign: "left", padding: "5px 8px", borderRadius: 5, fontSize: 13,
                        background: checked ? "var(--brand-soft)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "var(--surface-2)"; }}
                      onMouseLeave={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      {/* Pill preview */}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        borderRadius: 999, padding: "2px 7px",
                        backgroundColor: `${color}22`, border: `1px solid ${color}55`,
                      }}>
                        {Icon
                          ? <Icon size={10} color={color} strokeWidth={2} />
                          : <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
                        }
                        <span style={{ fontSize: 11, fontWeight: 500, color }}>{t.name}</span>
                      </span>
                      {checked && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "auto" }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
                {filteredTags.length === 0 && search && (
                  <div style={{ padding: "6px 8px", fontSize: 12, color: "var(--ink-4)" }}>No matches</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
