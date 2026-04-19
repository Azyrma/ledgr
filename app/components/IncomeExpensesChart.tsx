"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
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
  chartHeight?: number;
  stretch?: boolean;
};

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

export default function IncomeExpensesChart({ data, chartHeight = 240, stretch = false }: Props) {
  return (
    <div className={`v2-card flex flex-col ${stretch ? "h-full" : ""}`}>
      <div style={{ padding: "22px 24px 16px", display: "flex", flexDirection: "column", flex: stretch ? 1 : undefined }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div className="display-serif" style={{ fontSize: 17 }}>
              Income <em className="display-italic" style={{ color: "var(--brand)" }}>vs</em> expenses
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>Trailing 12 months</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <LegendDot color="var(--brand)" label="Income" />
            <LegendDot color="oklch(0.72 0.008 80)" label="Expenses" />
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: stretch ? undefined : chartHeight, flex: stretch ? 1 : undefined }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="30%" barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--hair)" strokeDasharray="2 3" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10.5, fill: "var(--ink-3)", fontFamily: "JetBrains Mono, monospace" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10.5, fill: "var(--ink-3)", fontFamily: "JetBrains Mono, monospace" }}
                tickFormatter={(v) => {
                  if (v === 0) return "0";
                  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
                  return String(v);
                }}
                width={44}
              />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
                isAnimationActive={false}
                formatter={(value, name) => [
                  formatCurrency(Number(value), "CHF", 0),
                  String(name).charAt(0).toUpperCase() + String(name).slice(1),
                ]}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid var(--hair-2)",
                  backgroundColor: "var(--surface)",
                  fontSize: "13px",
                  color: "var(--ink)",
                  boxShadow: "var(--shadow-2)",
                }}
                labelStyle={{ color: "var(--ink-3)", fontSize: 11.5, fontWeight: 500 }}
              />
              <Bar
                dataKey="income"
                fill="var(--brand)"
                fillOpacity={0.9}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                dataKey="expenses"
                fill="oklch(0.72 0.008 80)"
                fillOpacity={0.45}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
