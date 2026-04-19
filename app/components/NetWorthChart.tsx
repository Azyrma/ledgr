"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  values: number[];
  labels?: string[];
  height?: number;
  color?: string;
};

export default function NetWorthChart({
  values,
  labels,
  height = 130,
  color = "var(--brand)",
}: Props) {
  if (!values || values.length === 0) return null;

  const W = 600;
  const H = height;
  const padL = 72;  // space for Y axis labels
  const padR = 8;
  const padT = 8;
  const padB = 22;  // space for X axis labels
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...values);
  const min = 0;
  const range = max - min || 1;
  const n = values.length;

  const pts: [number, number][] = values.map((v, i) => [
    padL + (i / (n - 1)) * innerW,
    padT + innerH - ((v - min) / range) * innerH,
  ]);

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const fillD = `${d} L${pts[n - 1][0]},${H - padB} L${pts[0][0]},${H - padB} Z`;

  // Y axis: 3 ticks (min, mid, max)
  const yTicks = [min, (min + max) / 2, max];

  // Stable gradient ID (avoid random on every render)
  const gradId = "netWorthAreaGrad";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y axis grid lines + labels */}
      {yTicks.map((v, i) => {
        const y = padT + innerH - ((v - min) / range) * innerH;
        return (
          <g key={i}>
            <line
              x1={padL} y1={y} x2={W - padR} y2={y}
              stroke="var(--hair)"
              strokeDasharray={i === 0 ? "" : "2 4"}
            />
            <text
              x={padL - 8} y={y + 3.5}
              fontSize="10"
              fill="var(--ink-3)"
              textAnchor="end"
              fontFamily="'JetBrains Mono', monospace"
            >
              {formatCurrency(v, "CHF", 0)}
            </text>
          </g>
        );
      })}

      {/* Vertical month tick marks */}
      {pts.map(([x], i) => (
        <line
          key={i}
          x1={x} y1={padT + innerH}
          x2={x} y2={padT + innerH + 4}
          stroke="var(--hair-2)"
          strokeWidth="1"
        />
      ))}

      {/* Area fill */}
      <path d={fillD} fill={`url(#${gradId})`} />

      {/* Line */}
      <path
        d={d}
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* X axis labels — clamp first/last to avoid clipping */}
      {labels?.map((lab, i) => {
        if ((n - 1 - i) % 2 !== 0) return null;
        const x = padL + (i / (n - 1)) * innerW;
        const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={x}
            y={H - 5}
            fontSize="10"
            fill="var(--ink-3)"
            textAnchor={anchor}
          >
            {lab}
          </text>
        );
      })}
    </svg>
  );
}
