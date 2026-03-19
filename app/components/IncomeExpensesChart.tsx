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
  month: string;
  income: number;
  expenses: number;
};

type Props = {
  data: MonthlyData[];
};

export default function IncomeExpensesChart({ data }: Props) {
  return (
    <div className="card h-full bg-base-100 border border-base-300">
      <div className="card-body p-6">
        <h2 className="mb-6 text-sm font-semibold">Income vs Expenses</h2>
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
              isAnimationActive={false}
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
            <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
