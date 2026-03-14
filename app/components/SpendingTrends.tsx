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
  color = "text-zinc-900 dark:text-zinc-50",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </span>
      <div className="flex-1 border-t border-zinc-100 dark:border-zinc-800" />
    </div>
  );
}

export default function SpendingTrends({ data, dateRange }: Props) {
  const periodLabel =
    DATE_RANGES.find((r) => r.value === dateRange)?.label ?? "Selected period";

  return (
    <div className="h-full rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Spending Trends
      </h2>

      <Divider label="This week" />
      <Row label="Expenses" value={data.thisWeekExpenses} color="text-red-500 dark:text-red-400" />

      <Divider label={periodLabel} />
      <Row label="Income"   value={data.periodIncome}   color="text-emerald-600 dark:text-emerald-400" />
      <Row label="Expenses" value={data.periodExpenses} color="text-red-500 dark:text-red-400" />
      <Row label="Savings"  value={data.periodSavings}  color="text-blue-600 dark:text-blue-400" />

      <Divider label={`Same period last year (${periodLabel})`} />
      <Row label="Income"   value={data.samePeriodLastYearIncome}   color="text-emerald-600 dark:text-emerald-400" />
      <Row label="Expenses" value={data.samePeriodLastYearExpenses} color="text-red-500 dark:text-red-400" />
      <Row label="Savings"  value={data.samePeriodLastYearSavings}  color="text-blue-600 dark:text-blue-400" />
    </div>
  );
}
