import { DATE_RANGES } from "./DateFilter";
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

function Row({
  label,
  value,
  color = "",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-base-content/60">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <span className="text-xs font-medium uppercase tracking-wide text-base-content/40">
        {label}
      </span>
      <div className="flex-1 border-t border-base-300" />
    </div>
  );
}

export default function SpendingTrends({ data, dateRange }: Props) {
  const periodLabel =
    DATE_RANGES.find((r) => r.value === dateRange)?.label ?? "Selected period";

  return (
    <div className="card h-full bg-base-100 border border-base-300">
      <div className="card-body p-6">
        <h2 className="mb-2 text-sm font-semibold">Spending Trends</h2>

        <Divider label="This week" />
        <Row label="Expenses" value={data.thisWeekExpenses} color="text-error" />

        <Divider label={periodLabel} />
        <Row label="Income"   value={data.periodIncome}   color="text-success" />
        <Row label="Expenses" value={data.periodExpenses} color="text-error" />
        <Row label="Savings"  value={data.periodSavings}  color="text-info" />

        <Divider label={`Same period last year (${periodLabel})`} />
        <Row label="Income"   value={data.samePeriodLastYearIncome}   color="text-success" />
        <Row label="Expenses" value={data.samePeriodLastYearExpenses} color="text-error" />
        <Row label="Savings"  value={data.samePeriodLastYearSavings}  color="text-info" />
      </div>
    </div>
  );
}
