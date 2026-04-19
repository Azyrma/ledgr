import { formatCurrency } from "@/lib/utils";

export type TrendsData = {
  thisWeekExpenses: number;
  periodIncome: number;
  periodExpenses: number;
  periodSavings: number;
  samePeriodLastYearIncome: number;
  samePeriodLastYearExpenses: number;
  samePeriodLastYearSavings: number;
};

type Props = {
  data: TrendsData;
  dateRange: string;
};

function TrendRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{label}</div>
      <div className="display-serif num" style={{ fontSize: 20, marginTop: 2 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return "—";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? "+ " : "− ";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

function pctColor(pct: number, higherIsBetter: boolean): string {
  if (pct === 0) return "var(--ink-3)";
  const good = higherIsBetter ? pct > 0 : pct < 0;
  return good ? "var(--pos)" : "var(--neg)";
}

export default function SpendingTrends({ data }: Props) {
  const {
    thisWeekExpenses,
    periodIncome,
    periodExpenses,
    samePeriodLastYearIncome,
    samePeriodLastYearExpenses,
    samePeriodLastYearSavings,
    periodSavings,
  } = data;

  // YoY deltas
  const yoyIncomePct  = samePeriodLastYearIncome  > 0 ? ((periodIncome  - samePeriodLastYearIncome)  / samePeriodLastYearIncome)  * 100 : 0;
  const yoyExpPct     = samePeriodLastYearExpenses > 0 ? ((periodExpenses - samePeriodLastYearExpenses) / samePeriodLastYearExpenses) * 100 : 0;
  const yoySavPct     = samePeriodLastYearSavings  > 0 ? ((periodSavings  - samePeriodLastYearSavings)  / samePeriodLastYearSavings)  * 100 : 0;

  function formatYoY(pct: number, higherIsBetter = true): React.ReactNode {
    const color = pctColor(pct, higherIsBetter);
    const sign = pct >= 0 ? "+ " : "− ";
    const text = `${sign}${Math.abs(pct).toFixed(1)}%`;
    return <span className="num" style={{ fontSize: 13, fontWeight: 600, color }}>{text}</span>;
  }

  return (
    <div className="v2-card h-full flex flex-col">
      <div style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>This period</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TrendRow
            label="This week"
            value={formatCurrency(thisWeekExpenses)}
            sub="vs last period"
          />
          <TrendRow
            label="Avg daily"
            value={formatCurrency(periodExpenses > 0 ? periodExpenses / 30 : 0)}
            sub="30d rolling"
          />
          <TrendRow
            label="Period income"
            value={formatCurrency(periodIncome)}
            sub="total income"
          />
        </div>

        <div style={{ borderTop: "1px solid var(--hair)", paddingTop: 14, marginTop: 16 }}>
          <div className="muted" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
            Year over year
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="muted" style={{ fontSize: 13 }}>Income</span>
            {formatYoY(yoyIncomePct, true)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="muted" style={{ fontSize: 13 }}>Expenses</span>
            {formatYoY(yoyExpPct, false)}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted" style={{ fontSize: 13 }}>Savings</span>
            {formatYoY(yoySavPct, true)}
          </div>
        </div>
      </div>
    </div>
  );
}
