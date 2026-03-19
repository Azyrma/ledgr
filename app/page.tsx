"use client";

import { useEffect, useState } from "react";
import AccountFilter, { Account } from "./components/AccountFilter";
import DateFilter from "./components/DateFilter";
import SummaryCards from "./components/SummaryCards";
import IncomeExpensesChart, { MonthlyData } from "./components/IncomeExpensesChart";
import SpendingTrends, { TrendsData } from "./components/SpendingTrends";
import SpendingByCategory, { CategorySpend } from "./components/SpendingByCategory";
import FinancialHealth, { FinancialHealthData } from "./components/FinancialHealth";

type DashboardData = {
  summary:    { balance: number; income: number; expenses: number; savings: number };
  chart:      MonthlyData[];
  trends:     TrendsData;
  categories: CategorySpend[];
  health:     FinancialHealthData;
};

export default function DashboardPage() {
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [dateRange, setDateRange]               = useState("mtd");
  const [accounts, setAccounts]                 = useState<Account[]>([]);
  const [data, setData]                         = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((d) =>
        setAccounts(
          Array.isArray(d) ? d.map((a: Account) => ({ id: a.id, name: a.name })) : []
        )
      );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ dateRange });
    if (selectedAccounts.length > 0)
      params.set("accountIds", selectedAccounts.join(","));

    fetch(`/api/dashboard?${params}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); });
  }, [selectedAccounts, dateRange]);

  const summary = data?.summary;

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between border-b border-base-300 bg-base-100 px-8 py-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <AccountFilter
            accounts={accounts}
            selected={selectedAccounts}
            onChange={setSelectedAccounts}
          />
          <DateFilter selected={dateRange} onChange={setDateRange} />
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6 overflow-y-auto">
        <SummaryCards
          balance={summary?.balance   ?? 0}
          income={summary?.income     ?? 0}
          expenses={summary?.expenses ?? 0}
          savings={summary?.savings   ?? 0}
        />
        <div className="flex items-stretch gap-6">
          <div className="flex-1 min-w-0">
            <IncomeExpensesChart data={data?.chart ?? []} />
          </div>
          <div className="w-72 shrink-0">
            <SpendingTrends data={data?.trends ?? {
              thisWeekExpenses: 0, periodIncome: 0, periodExpenses: 0, periodSavings: 0,
              samePeriodLastYearIncome: 0, samePeriodLastYearExpenses: 0, samePeriodLastYearSavings: 0,
            }} dateRange={dateRange} />
          </div>
        </div>
        <div className="flex items-stretch gap-6">
          <div className="flex-1 min-w-0">
            <SpendingByCategory data={data?.categories ?? []} />
          </div>
          <div className="w-72 shrink-0">
            <FinancialHealth data={data?.health ?? {
              income: 0, expenses: 0, savings: 0, previousPeriodExpenses: 0,
              budgetCategoriesTotal: 0, budgetCategoriesOnTrack: 0, largestExpenseCategory: null,
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}
