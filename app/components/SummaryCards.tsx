import { formatCurrency } from "@/lib/utils";
import NetWorthChart from "./NetWorthChart";
import { DATE_RANGES } from "./DateFilter";

type Props = {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
  netWorth?: { values: number[]; monthIndices?: number[]; monthLabels?: string[]; tickIndices?: number[]; tickLabels?: string[] };
  dateRange?: string;
};

// Arrow-down icon (income flows in)
const ArrowDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

// Arrow-up icon (expenses flow out)
const ArrowUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

// Tree / leaf icon (savings)
const PiggyBankIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z" />
    <path d="M2 9v1a2 2 0 0 0 2 2h1" />
    <circle cx="15.5" cy="9.5" r=".5" fill="currentColor" stroke="none" />
  </svg>
);

export default function SummaryCards({ balance, income, expenses, savings, netWorth, dateRange }: Props) {
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const periodLabel = (DATE_RANGES.find((r) => r.value === dateRange)?.label ?? "This month").toLowerCase();

  return (
    <>
      {/* Hero net-worth card */}
      <div className="v2-card" style={{ padding: "28px 28px 0", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: netWorth ? "auto 1fr" : "1fr", gap: 40, alignItems: "center" }}>
          <div style={{ paddingBottom: 28 }}>
            <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Net balance
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="display-serif num" style={{ fontSize: 48, fontWeight: 500, color: "var(--ink)" }}>
                {formatCurrency(balance)}
              </span>
            </div>
            <div className="display-italic" style={{ fontSize: 15, color: "var(--brand)", marginTop: 8 }}>
              {savings >= 0 ? "+" : "−"}{formatCurrency(Math.abs(savings))}
              <span style={{ color: "var(--ink-3)", fontStyle: "normal", fontFamily: "'Inter', sans-serif", fontSize: 13, marginLeft: 8 }}>
                saved · {periodLabel} · {savingsRate.toFixed(1)}% rate
              </span>
            </div>
          </div>
          {netWorth && netWorth.values.length > 0 && (
            <div style={{ marginRight: -28 }}>
              <NetWorthChart
                values={netWorth.values}
                monthIndices={netWorth.monthIndices}
                monthLabels={netWorth.monthLabels}
                tickIndices={netWorth.tickIndices}
                tickLabels={netWorth.tickLabels}
                height={130}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary row — Income, Expenses, Savings Rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* Income */}
        <div className="v2-card v2-card-pad v2-card-hover">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Income · {periodLabel}
            </span>
            <span style={{
              color: "var(--pos)",
              background: "color-mix(in oklch, var(--pos) 14%, transparent)",
              width: 24, height: 24, borderRadius: 6,
              display: "grid", placeItems: "center",
            }}>
              <ArrowDownIcon />
            </span>
          </div>
          <p className="display-serif num" style={{ fontSize: 28, fontWeight: 500, marginTop: 10, color: "var(--ink)" }}>
            {formatCurrency(income)}
          </p>
        </div>

        {/* Expenses */}
        <div className="v2-card v2-card-pad v2-card-hover">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Expenses · {periodLabel}
            </span>
            <span style={{
              color: "var(--neg)",
              background: "color-mix(in oklch, var(--neg) 14%, transparent)",
              width: 24, height: 24, borderRadius: 6,
              display: "grid", placeItems: "center",
            }}>
              <ArrowUpIcon />
            </span>
          </div>
          <p className="display-serif num" style={{ fontSize: 28, fontWeight: 500, marginTop: 10, color: "var(--ink)" }}>
            {formatCurrency(expenses)}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="v2-card v2-card-pad v2-card-hover">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Savings rate
            </span>
            <span style={{
              color: "var(--brand)",
              background: "color-mix(in oklch, var(--brand) 14%, transparent)",
              width: 24, height: 24, borderRadius: 6,
              display: "grid", placeItems: "center",
            }}>
              <PiggyBankIcon />
            </span>
          </div>
          <p className="display-serif num" style={{ fontSize: 28, fontWeight: 500, marginTop: 10, color: "var(--ink)" }}>
            {savingsRate.toFixed(1)}<span style={{ fontSize: 18, color: "var(--ink-3)", marginLeft: 2 }}>%</span>
          </p>
        </div>
      </div>
    </>
  );
}
