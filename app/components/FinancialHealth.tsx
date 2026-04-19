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

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-base-content/40">
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
    <div className="v2-card h-full flex flex-col">
      <div className="card-body p-6">
        <h2 className="mb-3 display-serif" style={{ fontSize: 17 }}>Financial <em className="display-italic" style={{ color: "var(--brand)" }}>health</em></h2>

        <div className="divide-y divide-base-300">
          {/* Savings Rate */}
          <Metric label="Savings Rate">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold">{savingsRate.toFixed(1)}%</span>
              <span className="text-xs text-base-content/40">target 20%</span>
            </div>
            <progress
              className={`progress w-full mt-2 ${savingsRate >= 20 ? "progress-success" : savingsRate >= 14 ? "progress-warning" : "progress-error"}`}
              value={Math.min(savingsRate, 100)}
              max="100"
            ></progress>
            <p className="mt-1 text-xs text-base-content/40">
              {formatCurrency(savings)} saved of {formatCurrency(income)} income
            </p>
          </Metric>

          {/* Expense Ratio */}
          <Metric label="Expense Ratio">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold">{expenseRatio.toFixed(1)}%</span>
              <span className="text-xs text-base-content/40">target &lt;80%</span>
            </div>
            <progress
              className={`progress w-full mt-2 ${expenseRatio <= 80 ? "progress-success" : expenseRatio <= 90 ? "progress-warning" : "progress-error"}`}
              value={Math.min(expenseRatio, 100)}
              max="100"
            ></progress>
            <p className="mt-1 text-xs text-base-content/40">
              {formatCurrency(expenses)} spent of {formatCurrency(income)} income
            </p>
          </Metric>

          {/* Month-over-Month */}
          <Metric label="Spending vs Previous Period">
            {momChange === null ? (
              <p className="text-sm text-base-content/40">No prior period data</p>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">
                  {Math.abs(momChange).toFixed(1)}%
                </span>
                <span className={`text-sm font-medium ${momChange <= 0 ? "text-success" : "text-error"}`}>
                  {momChange <= 0 ? "▼ less" : "▲ more"} than last period
                </span>
              </div>
            )}
          </Metric>

          {/* Budget Adherence */}
          <Metric label="Budget Adherence">
            {budgetAdherence === null ? (
              <p className="text-sm text-base-content/40">No budgets set</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-semibold">{budgetAdherence.toFixed(0)}%</span>
                  <span className="text-xs text-base-content/40">
                    {budgetCategoriesOnTrack}/{budgetCategoriesTotal} on track
                  </span>
                </div>
                <progress
                  className={`progress w-full mt-2 ${budgetAdherence >= 80 ? "progress-success" : budgetAdherence >= 56 ? "progress-warning" : "progress-error"}`}
                  value={Math.min(budgetAdherence, 100)}
                  max="100"
                ></progress>
              </>
            )}
          </Metric>

          {/* Largest Expense Category */}
          <Metric label="Largest Expense Category">
            {largestExpenseCategory ? (
              <div className="flex items-baseline justify-between">
                <span className="text-base font-semibold">{largestExpenseCategory.name}</span>
                <span className="text-sm font-medium text-error">
                  {formatCurrency(largestExpenseCategory.amount)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-base-content/40">No expense data</p>
            )}
          </Metric>
        </div>
      </div>
    </div>
  );
}
