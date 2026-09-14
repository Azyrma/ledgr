"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader, { SplitTitle } from "../components/PageHeader";
import { formatCurrency } from "@/lib/utils";

type BudgetLeaf = {
  path: string;
  name: string;
  depth: number;
  color: string | null;
  budget: number;
  actual: number;
  remaining: number;
};

type BudgetGroup = { name: string; leaves: BudgetLeaf[] };

type BudgetData = { year: number; month: number; groups: BudgetGroup[] };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DEFAULT_COLOR = "#A89080";

function sum(leaves: BudgetLeaf[], key: "budget" | "actual") {
  return leaves.reduce((s, l) => s + l[key], 0);
}

function SummaryTile({ label, budget, actual }: { label: string; budget: number; actual: number }) {
  const remaining = budget - actual;
  return (
    <div style={{ flex: 1 }}>
      <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 6 }}>
        <span className="display-serif num" style={{ fontSize: 26, fontWeight: 500 }}>
          {formatCurrency(actual)}
        </span>
        <span className="muted num" style={{ fontSize: 13, marginLeft: 8 }}>
          of {formatCurrency(budget, "CHF", 0)}
        </span>
      </div>
      <div className="num" style={{ fontSize: 12, marginTop: 2, color: remaining >= 0 ? "var(--ink-3)" : "var(--neg)" }}>
        {remaining >= 0
          ? `${formatCurrency(remaining, "CHF", 0)} remaining`
          : `${formatCurrency(-remaining, "CHF", 0)} over`}
      </div>
    </div>
  );
}

function BudgetCell({ leaf, ym, onSaved }: { leaf: BudgetLeaf; ym: string; onSaved: () => void }) {
  async function save(value: string) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount === leaf.budget) return;
    await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: leaf.path, month: ym, amount }),
    });
    onSaved();
  }
  return (
    <input
      key={`${leaf.path}-${ym}-${leaf.budget}`}
      type="number"
      min={0}
      step={10}
      defaultValue={leaf.budget || ""}
      placeholder="0"
      onBlur={(e) => save(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="input input-xs input-ghost num w-24 text-right"
      style={{ fontSize: 13 }}
    />
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,  setData]  = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);

  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const fetchData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const d = await (await fetch(`/api/budget?year=${year}&month=${month}`)).json();
      if (!d.error) setData(d);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const groups = data?.groups ?? [];
  const income  = groups.find((g) => g.name === "Income");
  const needs   = groups.find((g) => g.name === "Needs");
  const wants   = groups.find((g) => g.name === "Wants");
  const savings = groups.find((g) => g.name === "Savings");
  const expenseLeaves = [...(needs?.leaves ?? []), ...(wants?.leaves ?? [])];

  const incomeActual  = sum(income?.leaves ?? [], "actual");
  const expenseActual = sum(expenseLeaves, "actual");
  const leftover = incomeActual - expenseActual;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <PageHeader
        title={<SplitTitle left="Bud" right="get" />}
        actions={
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
        }
      />

      <div style={{ flex: 1, padding: "0 36px 48px", overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>

            {/* Top summary: overall totals */}
            <div className="v2-card v2-card-pad" style={{ display: "flex", gap: 32 }}>
              <SummaryTile
                label="Total Income"
                budget={sum(income?.leaves ?? [], "budget")}
                actual={incomeActual}
              />
              <SummaryTile
                label="Total Expenses"
                budget={sum(expenseLeaves, "budget")}
                actual={expenseActual}
              />
              <SummaryTile
                label="Total Savings"
                budget={sum(savings?.leaves ?? [], "budget")}
                actual={sum(savings?.leaves ?? [], "actual")}
              />
              <div style={{ flex: 1, borderLeft: "1px solid var(--hair)", paddingLeft: 32 }}>
                <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Left over
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className="display-serif num" style={{ fontSize: 26, fontWeight: 500, color: leftover >= 0 ? "var(--ink)" : "var(--neg)" }}>
                    {formatCurrency(leftover)}
                  </span>
                </div>
                <div className="muted num" style={{ fontSize: 12, marginTop: 2 }}>
                  income − expenses · {MONTH_NAMES[month - 1]}
                </div>
              </div>
            </div>

            {/* Per-group tables */}
            {groups.map((group) => {
              const groupBudget = sum(group.leaves, "budget");
              const groupActual = sum(group.leaves, "actual");
              return (
                <div key={group.name} className="v2-card v2-card-pad">
                  <div className="display-serif" style={{ fontSize: 17, marginBottom: 10 }}>
                    {group.name}
                  </div>
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th className="text-right w-32">Budget</th>
                        <th className="text-right w-32">Actual</th>
                        <th className="text-right w-32">Remaining</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.leaves.map((leaf) => {
                        const color = leaf.color ?? DEFAULT_COLOR;
                        const over = group.name !== "Income" && leaf.budget > 0 && leaf.actual > leaf.budget;
                        return (
                          <tr key={leaf.path} className="hover">
                            <td>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, paddingLeft: leaf.depth * 14 }} title={leaf.path}>
                                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 13 }}>{leaf.name}</span>
                              </span>
                            </td>
                            <td className="text-right">
                              <BudgetCell leaf={leaf} ym={ym} onSaved={fetchData} />
                            </td>
                            <td className="text-right num" style={{ fontSize: 13 }}>
                              {leaf.actual !== 0 ? formatCurrency(leaf.actual) : <span className="muted">—</span>}
                            </td>
                            <td className="text-right num" style={{ fontSize: 13, color: over ? "var(--neg)" : undefined }}>
                              {leaf.budget > 0 || leaf.actual !== 0
                                ? formatCurrency(leaf.remaining)
                                : <span className="muted">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {/* Group summary below the group */}
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--hair)" }}>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>Total {group.name}</td>
                        <td className="text-right num" style={{ fontSize: 13, fontWeight: 600 }}>
                          {formatCurrency(groupBudget, "CHF", 0)}
                        </td>
                        <td className="text-right num" style={{ fontSize: 13, fontWeight: 600 }}>
                          {formatCurrency(groupActual)}
                        </td>
                        <td className="text-right num" style={{
                          fontSize: 13, fontWeight: 600,
                          color: group.name !== "Income" && groupActual > groupBudget && groupBudget > 0 ? "var(--neg)" : undefined,
                        }}>
                          {formatCurrency(groupBudget - groupActual)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
