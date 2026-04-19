"use client";

import { useEffect, useState } from "react";
import AccountFilter, { Account } from "./components/AccountFilter";
import DateFilter from "./components/DateFilter";
import SummaryCards from "./components/SummaryCards";
import IncomeExpensesChart, { MonthlyData } from "./components/IncomeExpensesChart";
import SpendingTrends, { TrendsData } from "./components/SpendingTrends";
import SpendingByCategory, { CategorySpend } from "./components/SpendingByCategory";
import DashboardAccounts, { DashboardAccount } from "./components/DashboardAccounts";
import { DashboardUpcoming, DashboardRecentTransactions, type RecentTransaction, type UpcomingTransaction } from "./components/DashboardRecent";
import PageHeader, { SplitTitle } from "./components/PageHeader";

type DashboardData = {
  summary:            { balance: number; income: number; expenses: number; savings: number };
  chart:              MonthlyData[];
  netWorth:           { values: number[]; labels: string[] };
  trends:             TrendsData;
  categories:         CategorySpend[];
  accounts:           DashboardAccount[];
  recentTransactions: RecentTransaction[];
  upcoming:           UpcomingTransaction[];
};

export default function DashboardPage() {
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [dateRange, setDateRange]               = useState("12m");
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
      <PageHeader
        title={<SplitTitle left="Dash" right="board" />}
        actions={
          <>
            <AccountFilter
              accounts={accounts}
              selected={selectedAccounts}
              onChange={setSelectedAccounts}
            />
            <DateFilter selected={dateRange} onChange={setDateRange} />
          </>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        <SummaryCards
          balance={summary?.balance   ?? 0}
          income={summary?.income     ?? 0}
          expenses={summary?.expenses ?? 0}
          savings={summary?.savings   ?? 0}
          netWorth={data?.netWorth}
        />

        {/* Row 1: Income vs Expenses + Trends */}
        <div className="flex items-stretch gap-4">
          <div className="flex-1 min-w-0">
            <IncomeExpensesChart data={data?.chart ?? []} stretch />
          </div>
          <div className="w-72 shrink-0">
            <SpendingTrends data={data?.trends ?? {
              thisWeekExpenses: 0, periodIncome: 0, periodExpenses: 0, periodSavings: 0,
              samePeriodLastYearIncome: 0, samePeriodLastYearExpenses: 0, samePeriodLastYearSavings: 0,
            }} dateRange={dateRange} />
          </div>
        </div>

        {/* Row 2: Spending by Category + Accounts */}
        <div className="flex items-stretch gap-4">
          <div className="flex-1 min-w-0">
            <SpendingByCategory data={data?.categories ?? []} />
          </div>
          <div className="w-72 shrink-0">
            <DashboardAccounts accounts={data?.accounts ?? []} />
          </div>
        </div>

        {/* Row 3: Upcoming + Recent Transactions */}
        <div className="flex items-stretch gap-4">
          <div className="flex-1 min-w-0">
            <DashboardUpcoming upcoming={data?.upcoming ?? []} />
          </div>
          <div style={{ flex: "1.3" }} className="min-w-0">
            <DashboardRecentTransactions transactions={data?.recentTransactions ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
