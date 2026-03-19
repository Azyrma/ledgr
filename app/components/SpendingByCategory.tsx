"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

export type CategorySpend = {
  name: string;
  amount: number;
  color?: string;
};

type Props = {
  data: CategorySpend[];
};

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6",
  "#ec4899", "#14b8a6", "#f97316", "#8b5cf6", "#84cc16",
];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{name}</p>
      <p className="text-base-content/60">{formatCurrency(value)}</p>
    </div>
  );
}

export default function SpendingByCategory({ data }: Props) {
  const filtered = data.filter((d) => d.amount > 0);
  const total = filtered.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="card h-full bg-base-100 border border-base-300">
      <div className="card-body p-6">
        <h2 className="mb-6 text-sm font-semibold">Spending by Category</h2>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-base-content/40">
            No category spending to display for this period.
          </p>
        ) : (
          <div className="flex items-center gap-8">
            <div className="h-56 w-56 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filtered}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {filtered.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color ?? COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-1 flex-wrap gap-x-8 gap-y-2">
              {filtered.map((entry, index) => {
                const pct = total > 0 ? ((entry.amount / total) * 100).toFixed(1) : "0";
                const color = entry.color || COLORS[index % COLORS.length];
                return (
                  <div key={entry.name} className="flex min-w-36 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm">{entry.name}</span>
                      <span className="text-xs text-base-content/50">
                        {formatCurrency(entry.amount)} · {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
