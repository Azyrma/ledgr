import { formatCurrency } from "@/lib/utils";

export type FinancialHealthData = {
  income: number;
  expenses: number;
  savings: number;
  previousPeriodExpenses: number;
  budgetCategoriesTotal: number;
  budgetCategoriesOnTrack: number;
  largestExpenseCategory: { name: string; amount: number } | null;
};

type Props = {
  data: FinancialHealthData;
};

function ProgressBar({
  value,
  target,
  invert = false,
}: {
  value: number;
  target: number;
  invert?: boolean;
}) {
  const pct = Math.min((value / target) * 100, 100);
  const isGood = invert ? value <= target : value >= target;
  const barColor = isGood
    ? "bg-emerald-500"
    : pct >= 70
    ? "bg-amber-400"
    : "bg-red-500";

  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
      <div
        className={`h-full rounded-full transition-all ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function FinancialHealth({ data }: Props) {
  const {
    income,
    expenses,
    savings,
    previousPeriodExpenses,
    budgetCategoriesTotal,
    budgetCategoriesOnTrack,
    largestExpenseCategory,
  } = data;

  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 0;
  const momChange =
    previousPeriodExpenses > 0
      ? ((expenses - previousPeriodExpenses) / previousPeriodExpenses) * 100
      : null;
  const budgetAdherence =
    budgetCategoriesTotal > 0
      ? (budgetCategoriesOnTrack / budgetCategoriesTotal) * 100
      : null;

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Financial Health
      </h2>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {/* Savings Rate */}
        <Metric label="Savings Rate">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {savingsRate.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              target 20%
            </span>
          </div>
          <ProgressBar value={savingsRate} target={20} />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {formatCurrency(savings)} saved of {formatCurrency(income)} income
          </p>
        </Metric>

        {/* Expense Ratio */}
        <Metric label="Expense Ratio">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {expenseRatio.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              target &lt;80%
            </span>
          </div>
          <ProgressBar value={expenseRatio} target={80} invert />
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            {formatCurrency(expenses)} spent of {formatCurrency(income)} income
          </p>
        </Metric>

        {/* Month-over-Month */}
        <Metric label="Spending vs Previous Period">
          {momChange === null ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No prior period data</p>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {Math.abs(momChange).toFixed(1)}%
              </span>
              <span
                className={`text-sm font-medium ${
                  momChange <= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {momChange <= 0 ? "▼ less" : "▲ more"} than last period
              </span>
            </div>
          )}
        </Metric>

        {/* Budget Adherence */}
        <Metric label="Budget Adherence">
          {budgetAdherence === null ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No budgets set</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {budgetAdherence.toFixed(0)}%
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {budgetCategoriesOnTrack}/{budgetCategoriesTotal} on track
                </span>
              </div>
              <ProgressBar value={budgetAdherence} target={80} />
            </>
          )}
        </Metric>

        {/* Largest Expense Category */}
        <Metric label="Largest Expense Category">
          {largestExpenseCategory ? (
            <div className="flex items-baseline justify-between">
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {largestExpenseCategory.name}
              </span>
              <span className="text-sm font-medium text-red-500 dark:text-red-400">
                {formatCurrency(largestExpenseCategory.amount)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">No expense data</p>
          )}
        </Metric>
      </div>
    </div>
  );
}
