"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export type MonthlyData = {
  month: string; // e.g. "Jan", "Feb"
  income: number;
  expenses: number;
};

type Props = {
  data: MonthlyData[];
};

export default function IncomeExpensesChart({ data }: Props) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Income vs Expenses
      </h2>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid vertical={false} stroke="#e4e4e7" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#a1a1aa" }}
            tickFormatter={(v) => formatCurrency(v, "CHF", 0)}
            width={70}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            position={{ y: 0 }}
            formatter={(value, name) => [
              formatCurrency(Number(value), "CHF", 0),
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid #3f3f46",
              backgroundColor: "#18181b",
              fontSize: "13px",
              color: "#f4f4f5",
            }}
            labelStyle={{ color: "#f4f4f5" }}
          />
          <Legend
            formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
            wrapperStyle={{ fontSize: "12px", paddingTop: "16px" }}
          />
          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
