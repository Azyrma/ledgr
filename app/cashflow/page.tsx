"use client";

import { ResponsiveSankey } from "@nivo/sankey";
import IncomeExpensesChart from "@/app/components/IncomeExpensesChart";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";

// ── Mock data ─────────────────────────────────────────────────────────────────

const CHART_DATA = [
  { month: "May '24", income: 8540, expenses: 3420 },
  { month: "Jun '24", income: 8900, expenses: 3650 },
  { month: "Jul '24", income: 9100, expenses: 4100 },
  { month: "Aug '24", income: 8900, expenses: 3750 },
  { month: "Sep '24", income: 9100, expenses: 3900 },
  { month: "Oct '24", income: 9100, expenses: 3480 },
  { month: "Nov '24", income: 8540, expenses: 3420 },
  { month: "Dec '24", income: 9100, expenses: 4210 },
  { month: "Jan '25", income: 8900, expenses: 3800 },
  { month: "Feb '25", income: 8900, expenses: 3650 },
  { month: "Mar '25", income: 9100, expenses: 3920 },
  { month: "Apr '25", income: 9100, expenses: 3715 },
];

const SANKEY_DATA = {
  nodes: [
    { id: "Salary",        color: "#3d9970" },
    { id: "Freelance",     color: "#2ecc71" },
    { id: "Dividends",     color: "#1abc9c" },
    { id: "Other Income",  color: "#a3b18a" },
    { id: "Savings",       color: "#27ae60" },
    { id: "Housing",       color: "#e67e22" },
    { id: "Food & Dining", color: "#f39c12" },
    { id: "Transport",     color: "#f1c40f" },
    { id: "Shopping",      color: "#9b59b6" },
    { id: "Health",        color: "#16a085" },
    { id: "Entertainment", color: "#8e44ad" },
    { id: "Subscriptions", color: "#2980b9" },
    { id: "Other",         color: "#95a5a6" },
  ],
  links: [
    { source: "Salary",    target: "Savings",       value: 3800 },
    { source: "Salary",    target: "Housing",        value: 1850 },
    { source: "Salary",    target: "Food & Dining",  value: 640  },
    { source: "Salary",    target: "Transport",      value: 310  },
    { source: "Salary",    target: "Shopping",       value: 290  },
    { source: "Salary",    target: "Health",         value: 180  },
    { source: "Salary",    target: "Other",          value: 130  },
    { source: "Freelance", target: "Savings",        value: 1200 },
    { source: "Freelance", target: "Entertainment",  value: 140  },
    { source: "Freelance", target: "Subscriptions",  value: 60   },
    { source: "Dividends", target: "Savings",        value: 320  },
    { source: "Other Income", target: "Savings",     value: 65   },
    { source: "Other Income", target: "Other",       value: 80   },
    { source: "Freelance", target: "Subscriptions",  value: 35   },
  ],
};

// ── Sankey ─────────────────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = Object.fromEntries(
  SANKEY_DATA.nodes.map((n) => [n.id, n.color])
);

function SankeyChart() {
  return (
    <div style={{ height: 420 }}>
      <ResponsiveSankey
        data={SANKEY_DATA}
        margin={{ top: 10, right: 140, bottom: 10, left: 140 }}
        align="justify"
        colors={(node) => NODE_COLORS[node.id] ?? "#888"}
        nodeOpacity={1}
        nodeThickness={14}
        nodeInnerPadding={3}
        nodeSpacing={12}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.18}
        linkHoverOpacity={0.35}
        linkContract={0}
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={12}
        labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
        valueFormat={(v) => `CHF ${v.toLocaleString()}`}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PERIOD = { income: 9100, expenses: 3715, savings: 5385, savingsRate: 59.2 };

export default function CashFlowPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Cash " right="Flow" />}
        actions={
          <select className="btn btn-sm" style={{ fontSize: 13, cursor: "pointer" }}>
            <option>Last 12 months</option>
            <option>Year to date</option>
            <option>This year</option>
            <option>All time</option>
          </select>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {/* Income vs Expenses chart */}
        <IncomeExpensesChart data={CHART_DATA} />

        {/* Sub-navbar: period selector */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px",
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--hair)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button className="btn btn-sm btn-ghost" style={{ padding: "4px 8px", minWidth: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="display-serif" style={{ fontSize: 17, minWidth: 140, textAlign: "center" }}>
              April <em className="display-italic" style={{ color: "var(--brand)" }}>2025</em>
            </span>
            <button className="btn btn-sm btn-ghost" style={{ padding: "4px 8px", minWidth: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            {["Month", "Quarter", "Year"].map((label, i) => (
              <button
                key={label}
                className="btn btn-sm btn-ghost"
                style={{
                  fontSize: 12.5,
                  background: i === 0 ? "var(--brand-soft)" : undefined,
                  color: i === 0 ? "var(--brand)" : undefined,
                  fontWeight: i === 0 ? 600 : undefined,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Income",       value: `CHF ${PERIOD.income.toLocaleString()}`,   color: "var(--pos)",   sub: "+3.2% vs last month" },
            { label: "Expenses",     value: `CHF ${PERIOD.expenses.toLocaleString()}`, color: "var(--neg)",   sub: "−5.2% vs last month" },
            { label: "Total Savings",value: `CHF ${PERIOD.savings.toLocaleString()}`,  color: "var(--brand)", sub: "+CHF 205 vs last month" },
            { label: "Savings Rate", value: `${PERIOD.savingsRate}%`,                  color: "var(--brand)", sub: "up from 56.9% last month" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="v2-card v2-card-pad">
              <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {label}
              </div>
              <div className="display-serif" style={{ fontSize: 26, color, lineHeight: 1.1 }}>
                {value}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Sankey diagram */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div className="display-serif" style={{ fontSize: 17 }}>
                Cash flow <em className="display-italic" style={{ color: "var(--brand)" }}>breakdown</em>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Where your income goes · April 2025</div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Hover nodes for details</span>
          </div>
          <SankeyChart />
        </div>
      </div>
    </div>
  );
}
