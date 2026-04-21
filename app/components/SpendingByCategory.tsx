"use client";

import Link from "next/link";
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
  "#6FA77A", "#8B7AA8", "#D4A574", "#7FA8C0", "#C98B8B",
  "#D49A6A", "#B88FC0", "#A88B6A", "#7FA87F", "#B89466",
];

// Inline SVG Donut component matching v2 design
function Donut({
  segments,
  size = 180,
  thickness = 20,
  centerLabel,
  centerValue,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} stroke="var(--surface-3)" strokeWidth={thickness} fill="none" />
        {segments.map((s, i) => {
          const len = total > 0 ? (s.value / total) * circ : 0;
          const dashOffset = -offset;
          offset += len;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      {centerValue && (
        <div style={{
          position: "absolute", inset: 0,
          display: "grid", placeItems: "center", textAlign: "center",
        }}>
          <div>
            <div className="muted" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              {centerLabel}
            </div>
            <div className="num" style={{ fontSize: 16, fontWeight: 600, marginTop: 2 }}>
              {centerValue}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Progress bar component
function Progress({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", height: 4, background: "var(--surface-3)", borderRadius: 100, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 100 }} />
    </div>
  );
}

export default function SpendingByCategory({ data }: Props) {
  const filtered = data.filter((d) => d.amount > 0);
  const total = filtered.reduce((sum, d) => sum + d.amount, 0);

  // Top 6 + Other
  const sorted = [...filtered].sort((a, b) => b.amount - a.amount);
  const top6 = sorted.slice(0, 6);
  const otherAmount = sorted.slice(6).reduce((s, d) => s + d.amount, 0);

  const segments = top6.map((c, i) => ({
    value: c.amount,
    color: c.color ?? COLORS[i % COLORS.length],
  }));
  if (otherAmount > 0) {
    segments.push({ value: otherAmount, color: "var(--ink-4)" });
  }

  const maxAmount = top6[0]?.amount ?? 1;

  if (filtered.length === 0) {
    return (
      <div className="v2-card v2-card-pad h-full flex flex-col">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div className="display-serif" style={{ fontSize: 17 }}>
            Spending by <em className="display-italic" style={{ color: "var(--brand)" }}>category</em>
          </div>
          <Link href="/reports" className="btn btn-sm btn-ghost" style={{ gap: 4 }}>
            Reports
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </Link>
        </div>
        <p className="muted" style={{ fontSize: 13, textAlign: "center", padding: "40px 0" }}>
          No category spending to display for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="v2-card v2-card-pad h-full flex flex-col">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div className="display-serif" style={{ fontSize: 17 }}>
            Spending by <em className="display-italic" style={{ color: "var(--brand)" }}>category</em>
          </div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            {filtered.length} categories
          </div>
        </div>
        <Link href="/reports" className="btn btn-sm btn-ghost" style={{ gap: 4 }}>
          Reports
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* Donut + category list */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 24, alignItems: "center" }}>
        <Donut
          segments={segments}
          size={180}
          thickness={20}
          centerLabel="Total"
          centerValue={formatCurrency(total, "CHF", 0)}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {top6.map((c, i) => {
            const color = c.color ?? COLORS[i % COLORS.length];
            return (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                {/* Colored square */}
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${color}1c`,
                  flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</div>
                  <div style={{ marginTop: 4 }}>
                    <Progress value={c.amount} max={maxAmount} color={color} />
                  </div>
                </div>

                <div className="num" style={{ fontSize: 13, fontWeight: 600, minWidth: 86, textAlign: "right" }}>
                  {formatCurrency(c.amount, "CHF", 0)}
                </div>
              </div>
            );
          })}

          {otherAmount > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "var(--surface-3)",
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ink-4)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500 }}>Other</div>
                <div style={{ marginTop: 4 }}>
                  <Progress value={otherAmount} max={maxAmount} color="var(--ink-4)" />
                </div>
              </div>
              <div className="num" style={{ fontSize: 13, fontWeight: 600, minWidth: 86, textAlign: "right" }}>
                {formatCurrency(otherAmount, "CHF", 0)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
