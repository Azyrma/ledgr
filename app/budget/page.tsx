"use client";

import { useEffect, useState } from "react";
import PageHeader, { SplitTitle } from "../components/PageHeader";
import { formatCurrency } from "@/lib/utils";

type BudgetCategory = {
  name: string;
  fullPath: string;
  spent: number;
  budget: number;
  color: string;
};

type BudgetGroup = {
  name: string;
  color: string;
  categories: BudgetCategory[];
};

type BudgetData = {
  year: number;
  month: number;
  income: number;
  groups: BudgetGroup[];
};

// --- Shared sub-components ---

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}

function Progress({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = value > max;
  return (
    <div style={{ width: "100%", height, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, pct)}%`,
        height: "100%",
        background: over ? "var(--neg)" : color,
        borderRadius: 100,
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// Waterfall bar: segments colored by group
function WaterfallBar({ groups, total }: { groups: BudgetGroup[]; total: number }) {
  return (
    <div style={{ display: "flex", height: 40, borderRadius: 8, overflow: "hidden", background: "var(--surface-3)" }}>
      {groups.flatMap((g) =>
        g.categories.map((cat, ci) => {
          const pct = total > 0 ? (cat.budget / total) * 100 : 0;
          // Alternate opacity within a group for visual variety
          const opacity = 0.55 + (ci % 3) * 0.15;
          const groupColorMap: Record<string, string> = {
            Needs: "var(--brand)",
            Wants: "var(--warn)",
            Savings: "var(--info)",
          };
          const color = groupColorMap[g.name] ?? "var(--brand)";
          return (
            <div
              key={`${g.name}-${cat.name}`}
              title={`${cat.name} · ${formatCurrency(cat.budget, "CHF", 0)}`}
              style={{
                width: `${pct}%`,
                background: color,
                opacity,
                borderRight: "2px solid var(--surface)",
                minWidth: pct > 0 ? 2 : 0,
              }}
            />
          );
        })
      )}
    </div>
  );
}

// Single category row
function CategoryRow({ cat }: { cat: BudgetCategory }) {
  const over = cat.spent > cat.budget;
  const leftover = cat.budget - cat.spent;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--hair)" }}>
      {/* Color square */}
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${cat.color}1c`, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ width: 10, height: 10, borderRadius: 3, background: cat.color }} />
      </div>

      {/* Name + progress */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 13.5, fontWeight: 500 }}>{cat.name}</span>
          <span className="num" style={{ fontSize: 12.5 }}>
            <span style={{ fontWeight: 600 }}>{formatCurrency(cat.spent, "CHF", 0)}</span>
            <span className="muted"> / {formatCurrency(cat.budget, "CHF", 0)}</span>
          </span>
        </div>
        <Progress value={cat.spent} max={cat.budget} color={cat.color} height={5} />
      </div>

      {/* Leftover / over indicator */}
      <div style={{ width: 72, textAlign: "right", flexShrink: 0 }}>
        {over ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--neg)" }}>
            +{formatCurrency(cat.spent - cat.budget, "CHF", 0).replace("CHF\u00a0", "")} over
          </span>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>
            {formatCurrency(leftover, "CHF", 0).replace("CHF\u00a0", "")} left
          </span>
        )}
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function BudgetPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/budget?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year, month]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const income = data?.income ?? 0;
  const groups = data?.groups ?? [];

  const allCats = groups.flatMap((g) => g.categories);
  const budgetTotal = allCats.reduce((s, c) => s + c.budget, 0);
  const spentTotal  = allCats.reduce((s, c) => s + c.spent,  0);
  const leftover    = income - spentTotal;
  const overCount   = allCats.filter((c) => c.spent > c.budget).length;

  const groupColorMap: Record<string, string> = {
    Needs:   "var(--brand)",
    Wants:   "var(--warn)",
    Savings: "var(--info)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title={<SplitTitle left="Bud" right="get" />}
      />

      <div style={{ flex: 1, padding: "0 36px 48px", overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <span className="muted" style={{ fontSize: 14 }}>Loading budget…</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 12 }}>

            {/* ── Left panel ── */}
            <div className="v2-card v2-card-pad">
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>
                    {MONTH_NAMES[month - 1]} budget
                  </div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                    Planned against income {income > 0 ? formatCurrency(income, "CHF", 0) : "—"}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button className="btn btn-sm btn-ghost" onClick={prevMonth} title="Previous month">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 500, minWidth: 80, textAlign: "center" }}>
                    {MONTH_NAMES[month - 1].slice(0, 3)} {year}
                  </span>
                  <button className="btn btn-sm btn-ghost" onClick={nextMonth} title="Next month">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Waterfall bar */}
              {allCats.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <WaterfallBar groups={groups} total={budgetTotal} />
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8, fontSize: 12, flexWrap: "wrap" }}>
                    {groups.map((g) => (
                      <LegendDot
                        key={g.name}
                        color={groupColorMap[g.name] ?? g.color}
                        label={`${g.name} · ${formatCurrency(g.categories.reduce((s, c) => s + c.budget, 0), "CHF", 0)}`}
                      />
                    ))}
                    <span className="muted" style={{ marginLeft: "auto" }}>
                      Total {formatCurrency(budgetTotal, "CHF", 0)} of {income > 0 ? formatCurrency(income, "CHF", 0) : "—"} income
                    </span>
                  </div>
                </div>
              )}

              {/* Category groups */}
              {allCats.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0" }}>
                  <div className="muted" style={{ fontSize: 14 }}>No transactions found for this period.</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>Add transactions with categories to see your budget breakdown.</div>
                </div>
              ) : (
                <div style={{ marginTop: 22 }}>
                  {groups.map((group) => {
                    if (group.categories.length === 0) return null;
                    const groupSpent  = group.categories.reduce((s, c) => s + c.spent,  0);
                    const groupBudget = group.categories.reduce((s, c) => s + c.budget, 0);
                    return (
                      <div key={group.name} style={{ marginBottom: 22 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span className="display-serif" style={{ fontSize: 18, fontWeight: 500 }}>{group.name}</span>
                            <span className="muted" style={{ fontSize: 12 }}>{group.categories.length} categories</span>
                          </div>
                          <div className="num" style={{ fontSize: 13, fontWeight: 600 }}>
                            <span className="muted" style={{ fontWeight: 400 }}>spent </span>
                            {formatCurrency(groupSpent, "CHF", 0)}
                            <span className="muted" style={{ fontWeight: 400 }}> of {formatCurrency(groupBudget, "CHF", 0)}</span>
                          </div>
                        </div>
                        <div>
                          {group.categories.map((cat) => (
                            <CategoryRow key={cat.fullPath} cat={cat} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Right sidebar ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Expected left over */}
              <div className="v2-card v2-card-pad">
                <div style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                  Expected left over
                </div>
                <div style={{ marginTop: 10 }}>
                  <span className="display-serif num" style={{
                    fontSize: 32, fontWeight: 500,
                    color: leftover >= 0 ? "var(--ink)" : "var(--neg)",
                  }}>
                    {income > 0 ? formatCurrency(leftover) : "—"}
                  </span>
                </div>
                {income > 0 && (
                  <>
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      {((leftover / income) * 100).toFixed(1)}% of income
                      {overCount > 0 && ` · ${overCount} ${overCount === 1 ? "category" : "categories"} over`}
                    </div>
                    <div style={{ marginTop: 16, height: 10, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden", display: "flex" }}>
                      <div style={{
                        width: `${Math.min(100, (spentTotal / income) * 100)}%`,
                        background: "var(--brand)",
                        borderRadius: "100px 0 0 100px",
                        transition: "width 0.4s ease",
                      }} />
                      <div style={{
                        width: `${Math.min(100 - Math.min(100, (spentTotal / income) * 100), Math.max(0, (leftover / income) * 100))}%`,
                        background: "var(--pos)",
                        opacity: 0.4,
                        borderRadius: "0 100px 100px 0",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5 }}>
                      <span className="muted">Spent {formatCurrency(spentTotal, "CHF", 0)}</span>
                      <span className="muted">Income {formatCurrency(income, "CHF", 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Savings goals */}
              <div className="v2-card v2-card-pad">
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Savings goals</div>
                {[
                  { name: "Emergency fund", target: 12000, cur: 8400, color: "#6FA77A" },
                  { name: "Japan trip",     target: 3500,  cur: 1820, color: "#C98B8B" },
                  { name: "New laptop",     target: 2400,  cur: 2100, color: "#7FA8C0" },
                ].map((g, i, arr) => (
                  <div key={g.name} style={{ marginBottom: i < arr.length - 1 ? 14 : 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</span>
                      <span className="num" style={{ fontSize: 12 }}>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(g.cur, "CHF", 0)}</span>
                        <span className="muted"> / {formatCurrency(g.target, "CHF", 0)}</span>
                      </span>
                    </div>
                    <Progress value={g.cur} max={g.target} color={g.color} height={5} />
                  </div>
                ))}
                <button className="btn btn-sm" style={{ marginTop: 14, width: "100%", justifyContent: "center" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New goal
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
