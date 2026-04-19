"use client";

import { useState } from "react";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";

// ── Mock data ─────────────────────────────────────────────────────────────────

const SPENDING_CATS = [
  { name: "Housing",        amount: 1850, color: "oklch(0.52 0.12 35)"  },
  { name: "Food & Dining",  amount: 640,  color: "oklch(0.6 0.13 40)"   },
  { name: "Transport",      amount: 310,  color: "oklch(0.65 0.1 50)"   },
  { name: "Shopping",       amount: 290,  color: "oklch(0.62 0.09 270)" },
  { name: "Health",         amount: 180,  color: "oklch(0.58 0.1 200)"  },
  { name: "Entertainment",  amount: 140,  color: "oklch(0.58 0.12 310)" },
  { name: "Subscriptions",  amount: 95,   color: "oklch(0.55 0.08 240)" },
  { name: "Other",          amount: 210,  color: "var(--ink-4)"         },
];

const INCOME_CATS = [
  { name: "Salary",         amount: 7200, color: "oklch(0.52 0.09 155)" },
  { name: "Freelance",      amount: 1400, color: "oklch(0.46 0.1 155)"  },
  { name: "Dividends",      amount: 320,  color: "oklch(0.55 0.1 200)"  },
  { name: "Interest",       amount: 90,   color: "oklch(0.58 0.08 170)" },
  { name: "Other",          amount: 90,   color: "var(--ink-4)"         },
];

const SPENDING_TXS = [
  { id: 1,  date: "Apr 18", description: "Migros",             category: "Food & Dining", categoryColor: "oklch(0.6 0.13 40)",   account: "UBS Checking", amount: -87.40  },
  { id: 2,  date: "Apr 17", description: "SBB Ticket",         category: "Transport",     categoryColor: "oklch(0.65 0.1 50)",   account: "UBS Checking", amount: -24.00  },
  { id: 3,  date: "Apr 16", description: "Coop",               category: "Food & Dining", categoryColor: "oklch(0.6 0.13 40)",   account: "UBS Checking", amount: -53.20  },
  { id: 4,  date: "Apr 15", description: "Netflix",            category: "Subscriptions", categoryColor: "oklch(0.55 0.08 240)", account: "Revolut",      amount: -15.90  },
  { id: 5,  date: "Apr 14", description: "Galaxus",            category: "Shopping",      categoryColor: "oklch(0.62 0.09 270)", account: "Revolut",      amount: -149.00 },
  { id: 6,  date: "Apr 13", description: "Arztpraxis Zürich",  category: "Health",        categoryColor: "oklch(0.58 0.1 200)",  account: "UBS Checking", amount: -90.00  },
  { id: 7,  date: "Apr 12", description: "Rent April",         category: "Housing",       categoryColor: "oklch(0.52 0.12 35)",  account: "UBS Checking", amount: -1850.00},
  { id: 8,  date: "Apr 11", description: "Spotify",            category: "Subscriptions", categoryColor: "oklch(0.55 0.08 240)", account: "Revolut",      amount: -10.99  },
  { id: 9,  date: "Apr 10", description: "Kino Abaton",        category: "Entertainment", categoryColor: "oklch(0.58 0.12 310)", account: "Revolut",      amount: -18.00  },
  { id: 10, date: "Apr 09", description: "Digitec",            category: "Shopping",      categoryColor: "oklch(0.62 0.09 270)", account: "Revolut",      amount: -79.00  },
  { id: 11, date: "Apr 08", description: "Tankstelle Shell",   category: "Transport",     categoryColor: "oklch(0.65 0.1 50)",   account: "UBS Checking", amount: -68.00  },
  { id: 12, date: "Apr 07", description: "Restaurant Kronenhalle", category: "Food & Dining", categoryColor: "oklch(0.6 0.13 40)", account: "Revolut",   amount: -42.50  },
];

const INCOME_TXS = [
  { id: 1,  date: "Apr 25", description: "Salary – April",       category: "Salary",    categoryColor: "oklch(0.52 0.09 155)", account: "UBS Checking", amount: 7200.00 },
  { id: 2,  date: "Apr 01", description: "Freelance Invoice #12", category: "Freelance", categoryColor: "oklch(0.46 0.1 155)",  account: "UBS Checking", amount: 1400.00 },
  { id: 3,  date: "Mar 31", description: "Novartis Dividends",    category: "Dividends", categoryColor: "oklch(0.55 0.1 200)",  account: "IBKR",         amount: 320.00  },
  { id: 4,  date: "Mar 28", description: "UBS Savings Interest",  category: "Interest",  categoryColor: "oklch(0.58 0.08 170)", account: "UBS Savings",  amount: 90.00   },
  { id: 5,  date: "Mar 25", description: "Salary – March",        category: "Salary",    categoryColor: "oklch(0.52 0.09 155)", account: "UBS Checking", amount: 7200.00 },
  { id: 6,  date: "Mar 01", description: "Freelance Invoice #11", category: "Freelance", categoryColor: "oklch(0.46 0.1 155)",  account: "UBS Checking", amount: 1400.00 },
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
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} stroke="var(--surface-3)" strokeWidth={thickness} fill="none" />
        {segments.map((s, i) => {
          const len = total > 0 ? (s.value / total) * circ : 0;
          const dashOffset = -offset;
          offset += len;
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
            CHF {total.toLocaleString()}
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

  const cats = tab === "spending" ? SPENDING_CATS : INCOME_CATS;
  const txs  = tab === "spending" ? SPENDING_TXS  : INCOME_TXS;
  const total = cats.reduce((s, c) => s + c.amount, 0);
  const maxAmount = Math.max(...cats.map((c) => c.amount));

  const segments = cats.map((c) => ({ value: c.amount, color: c.color }));

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Re" right="ports" />}
        titleExtra={
          <div style={{ display: "flex", borderRadius: 10, border: "1px solid var(--hair-2)", overflow: "hidden" }}>
            {(["spending", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "7px 20px", fontSize: 13, cursor: "pointer", border: "none",
                  background: tab === t ? "var(--brand)" : "var(--surface)",
                  color: tab === t ? "var(--brand-ink)" : "var(--ink-2)",
                  fontWeight: tab === t ? 600 : 400,
                  textTransform: "capitalize",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        }
        actions={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="btn btn-sm" style={{ fontSize: 13, cursor: "pointer" }}>
              <option>This month</option>
              <option>Last month</option>
              <option>Last 3 months</option>
              <option>Last 6 months</option>
              <option>Year to date</option>
            </select>
            <button className="btn btn-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {/* Donut + category breakdown */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
            {/* Large donut */}
            <Donut
              segments={segments}
              total={total}
              label={tab === "spending" ? "Total spent" : "Total earned"}
              size={260}
              thickness={28}
            />

            {/* Category list */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              {cats.map((c) => {
                const pct = Math.round((c.amount / total) * 100);
                return (
                  <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "7px 0", borderBottom: "1px solid var(--hair)" }}>
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
                      CHF {c.amount.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Transactions table */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="display-serif" style={{ fontSize: 17 }}>
              {tab === "spending" ? "Expense" : "Income"}{" "}
              <em className="display-italic" style={{ color: "var(--brand)" }}>transactions</em>
            </div>
            <span className="chip" style={{ fontSize: 12 }}>{txs.length} transactions</span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Description", "Category", "Account", "Amount"].map((h, i) => (
                  <th key={h} style={{
                    textAlign: i === 4 ? "right" : "left",
                    fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "var(--ink-3)", fontWeight: 500,
                    paddingBottom: 10, borderBottom: "1px solid var(--hair)",
                    paddingRight: i < 4 ? 16 : 0,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: i < txs.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <td className="muted" style={{ fontSize: 12.5, padding: "10px 16px 10px 0", whiteSpace: "nowrap" }}>
                    {t.date}
                  </td>
                  <td style={{ fontSize: 13.5, fontWeight: 500, padding: "10px 16px 10px 0" }}>
                    {t.description}
                  </td>
                  <td style={{ padding: "10px 16px 10px 0" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, padding: "3px 8px", borderRadius: 6,
                      background: `${t.categoryColor}18`,
                      color: t.categoryColor,
                      fontWeight: 500,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: t.categoryColor, display: "inline-block" }} />
                      {t.category}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5, padding: "10px 16px 10px 0" }}>
                    {t.account}
                  </td>
                  <td className="num" style={{
                    textAlign: "right", fontSize: 13.5, fontWeight: 600, padding: "10px 0",
                    color: t.amount < 0 ? "var(--neg)" : "var(--pos)",
                  }}>
                    {t.amount < 0 ? "−" : "+"}CHF {Math.abs(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
