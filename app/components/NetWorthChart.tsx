"use client";

import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  values: number[];
  monthIndices?: number[];  // all month-start indices — for hover snapping
  monthLabels?: string[];   // label per month — for tooltip
  tickIndices?: number[];   // which indices get an X axis label
  tickLabels?: string[];    // label for each tick
  height?: number;
  color?: string;
};

export default function NetWorthChart({
  values,
  monthIndices,
  monthLabels,
  tickIndices,
  tickLabels,
  height = 130,
  color = "var(--brand)",
}: Props) {
  const [hoveredMi, setHoveredMi] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!values || values.length < 2) return null;

  const W = 600;
  const H = height;
  const padL = 72;
  const padR = 24;
  const padT = 8;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const dataMax = Math.max(...values);
  const dataMin = Math.min(...values);
  const hasNegative = dataMin < 0;

  // When negative values exist, center zero and scale symmetrically outward.
  const extent = hasNegative ? Math.max(Math.abs(dataMax), Math.abs(dataMin)) : dataMax;
  const max = hasNegative ? extent : dataMax;
  const min = hasNegative ? -extent : 0;
  const range = max - min || 1;
  const n = values.length;

  const toY = (v: number) => padT + innerH - ((v - min) / range) * innerH;
  const zeroY = toY(0);

  const pts: [number, number][] = values.map((v, i) => [
    padL + (i / (n - 1)) * innerW,
    toY(v),
  ]);

  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  // Fill closes to the zero line, not the bottom edge.
  const fillD = `${d} L${pts[n - 1][0]},${zeroY} L${pts[0][0]},${zeroY} Z`;

  const yTicks = hasNegative
    ? [-extent, 0, extent]
    : [0, dataMax / 2, dataMax];
  const gradId = "netWorthAreaGrad";

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    if (!svgRef.current || !monthIndices?.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bestDist = Infinity;
    monthIndices.forEach((dataIdx, mi) => {
      const mx = padL + (dataIdx / (n - 1)) * innerW;
      const dist = Math.abs(svgX - mx);
      if (dist < bestDist) { bestDist = dist; best = mi; }
    });
    setHoveredMi(best);
  }

  // Tooltip geometry
  const TW = 168, TH = 62;
  let tooltipX = 0, tooltipY = 0, tooltipValue = 0, tooltipDelta: number | null = null, tooltipLabel = "";
  if (hoveredMi !== null && monthIndices && monthLabels) {
    const dataIdx = monthIndices[hoveredMi];
    tooltipX = padL + (dataIdx / (n - 1)) * innerW;
    tooltipY = pts[dataIdx][1];
    tooltipValue = values[dataIdx];
    tooltipLabel = monthLabels[hoveredMi];
    if (hoveredMi > 0) {
      tooltipDelta = tooltipValue - values[monthIndices[hoveredMi - 1]];
    }
  }
  const tx = Math.max(padL, Math.min(W - padR - TW, tooltipX - TW / 2));
  const ty = Math.max(padT + 2, tooltipY - TH - 14);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", overflow: "visible" }}
      onMouseLeave={() => setHoveredMi(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1={padT} y2={zeroY} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Y axis grid lines + labels */}
      {yTicks.map((v, i) => {
        const y = toY(v);
        const isZero = v === 0;
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--hair)" strokeDasharray={isZero ? "" : "2 4"} />
            <text x={padL - 8} y={y + 3.5} fontSize="10" fill="var(--ink-3)" textAnchor="end" fontFamily="'JetBrains Mono', monospace">
              {formatCurrency(v, "CHF", 0)}
            </text>
          </g>
        );
      })}

      {/* Tick marks at each month boundary (first = left edge, last = right edge) */}
      {monthIndices?.map((dataIdx, i) => {
        const x = padL + (dataIdx / (n - 1)) * innerW;
        return <line key={i} x1={x} y1={padT + innerH} x2={x} y2={padT + innerH + 4} stroke="var(--hair-2)" strokeWidth="1" />;
      })}

      {/* Area fill */}
      <path d={fillD} fill={`url(#${gradId})`} />

      {/* Line */}
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {/* X axis labels */}
      {tickLabels?.map((lab, ti) => {
        if (!tickIndices) return null;
        const dataIdx = tickIndices[ti];
        const x = padL + (dataIdx / (n - 1)) * innerW;
        const anchor = "middle";
        return (
          <text key={ti} x={x} y={H - 5} fontSize="10" fill="var(--ink-3)" textAnchor={anchor}>
            {lab}
          </text>
        );
      })}

      {/* Hover indicator */}
      {hoveredMi !== null && (
        <g>
          <line
            x1={tooltipX} y1={padT} x2={tooltipX} y2={padT + innerH}
            stroke={color} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3"
          />
          <circle cx={tooltipX} cy={tooltipY} r="4.5" fill={color} />
          <circle cx={tooltipX} cy={tooltipY} r="2.5" fill="var(--surface)" />

          <rect x={tx} y={ty} width={TW} height={TH} rx="7"
            fill="var(--surface)" stroke="var(--hair)" strokeWidth="1"
          />
          <text x={tx + 12} y={ty + 16} fontSize="10.5" fill="var(--ink-3)" fontFamily="'Inter', sans-serif" fontWeight="500">
            {tooltipLabel}
          </text>
          <text x={tx + 12} y={ty + 35} fontSize="14" fill="var(--ink)" fontFamily="'JetBrains Mono', monospace" fontWeight="600">
            {formatCurrency(tooltipValue, "CHF", 0)}
          </text>
          {tooltipDelta !== null && (() => {
            const prevValue = tooltipValue - tooltipDelta;
            const pct = prevValue !== 0 ? (tooltipDelta / Math.abs(prevValue)) * 100 : 0;
            return (
              <text x={tx + 12} y={ty + 52} fontSize="10.5" fontFamily="'JetBrains Mono', monospace" fontWeight="500"
                fill={tooltipDelta >= 0 ? "var(--pos)" : "var(--neg)"}>
                {tooltipDelta >= 0 ? "+" : "−"}{Math.abs(pct).toFixed(1)}% vs prev month
              </text>
            );
          })()}
          {tooltipDelta === null && (
            <text x={tx + 12} y={ty + 52} fontSize="10.5" fill="var(--ink-4)" fontFamily="'Inter', sans-serif">
              first month in view
            </text>
          )}
        </g>
      )}

      {/* Transparent mouse-capture overlay */}
      <rect
        x={padL} y={padT} width={innerW} height={innerH}
        fill="transparent" style={{ cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
      />
    </svg>
  );
}
