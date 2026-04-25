"use client";

import { useState, useEffect, useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import IncomeExpensesChart from "@/app/components/IncomeExpensesChart";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";
import { formatCurrency } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

type Granularity = "month" | "quarter" | "year";

type SankeyBucket = {
  id: "needs" | "wants" | "savings";
  label: string;
  total: number;
  groups: Array<{
    name: string;
    total: number;
    leaves: Array<{ name: string; total: number }>;
  }>;
};

type CashflowData = {
  summary:  { income: number; expenses: number; savings: number; savingsRate: number };
  prev:     { income: number; expenses: number; savings: number; savingsRate: number };
  chart:    Array<{ month: string; income: number; expenses: number }>;
  sankey:   { income: number; buckets: SankeyBucket[] };
};

// ── Period math ────────────────────────────────────────────────────────────────

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

type PeriodRange = {
  from: string;
  to: string;
  label: { main: string; accent: string };
};

function periodRange(g: Granularity, offset: number, now: Date): PeriodRange {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  if (g === "month") {
    const first = new Date(y, m + offset, 1);
    const fy = first.getFullYear();
    const fm = first.getMonth();
    const from  = toIso(first);
    const to    = offset === 0 ? toIso(now) : toIso(new Date(fy, fm + 1, 0));
    const main  = first.toLocaleString("en-US", { month: "long" });
    return { from, to, label: { main, accent: String(fy) } };
  }

  if (g === "quarter") {
    // current quarter index (0–3), adjust by offset quarters
    const totalMonthOffset = m + offset * 3;
    const absYear  = y + Math.floor(totalMonthOffset / 12);
    const absMon   = ((totalMonthOffset % 12) + 12) % 12;
    const qIdx     = Math.floor(absMon / 3); // 0-indexed quarter
    const from     = toIso(new Date(absYear, qIdx * 3, 1));
    const to       = offset === 0 ? toIso(now) : toIso(new Date(absYear, qIdx * 3 + 3, 0));
    return { from, to, label: { main: `Q${qIdx + 1}`, accent: String(absYear) } };
  }

  // year
  const absYear = y + offset;
  const from = toIso(new Date(absYear, 0, 1));
  const to   = offset === 0 ? toIso(now) : toIso(new Date(absYear, 11, 31));
  return { from, to, label: { main: "", accent: String(absYear) } };
}

// ── Sankey helpers ─────────────────────────────────────────────────────────────

const BUCKET_COLORS: Record<string, { base: string; shades: string[] }> = {
  Needs:   { base: "#e67e22", shades: ["#e67e22", "#d35400", "#f39c12", "#e59866", "#ca6f1e"] },
  Wants:   { base: "#9b59b6", shades: ["#9b59b6", "#8e44ad", "#a569bd", "#d2b4de", "#6c3483"] },
  Savings: { base: "#2980b9", shades: ["#2980b9", "#1abc9c", "#16a085", "#1a5276", "#7fb3d3"] },
};
const INCOME_COLOR = "#3d9970";

function buildSankeyData(sankey: CashflowData["sankey"]) {
  const nodes: Array<{ id: string }> = [];
  const links: Array<{ source: string; target: string; value: number }> = [];
  const colorMap: Record<string, string> = {};

  const incomeId = "Income";
  nodes.push({ id: incomeId });
  colorMap[incomeId] = INCOME_COLOR;

  for (const bucket of sankey.buckets) {
    if (bucket.total <= 0) continue;
    const bucketId = bucket.label;
    nodes.push({ id: bucketId });
    const pal = BUCKET_COLORS[bucket.label] ?? { base: "#888", shades: ["#888"] };
    colorMap[bucketId] = pal.base;
    links.push({ source: incomeId, target: bucketId, value: Math.round(bucket.total * 100) / 100 });

    bucket.groups.forEach((group, gi) => {
      if (group.total <= 0) return;
      const groupId = `${bucket.label} / ${group.name}`;
      nodes.push({ id: groupId });
      colorMap[groupId] = pal.shades[gi % pal.shades.length];
      links.push({ source: bucketId, target: groupId, value: Math.round(group.total * 100) / 100 });

      group.leaves.forEach((leaf, li) => {
        if (leaf.total <= 0) return;
        const leafId = `${bucket.label} / ${group.name} / ${leaf.name}`;
        nodes.push({ id: leafId });
        colorMap[leafId] = pal.shades[(gi + li + 1) % pal.shades.length];
        links.push({ source: groupId, target: leafId, value: Math.round(leaf.total * 100) / 100 });
      });
    });
  }

  return { nodes, links, colorMap };
}

// ── Stat card delta helpers ────────────────────────────────────────────────────

function pctDelta(cur: number, prev: number): string {
  if (prev === 0) return "—";
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

function absDelta(cur: number, prev: number): string {
  const d = cur - prev;
  return `${d >= 0 ? "+" : "−"}CHF ${Math.abs(d).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function CashFlowPage() {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [offset, setOffset]           = useState(0);
  const [data, setData]               = useState<CashflowData | null>(null);

  const { from, to, label } = periodRange(granularity, offset, new Date());
  const granLabel = granularity; // "month" | "quarter" | "year"

  useEffect(() => {
    setData(null);
    fetch(`/api/cashflow?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error);
  }, [from, to]);

  function changeGranularity(g: Granularity) {
    setGranularity(g);
    setOffset(0);
  }

  const sankeyData = useMemo(() => {
    if (!data) return null;
    return buildSankeyData(data.sankey);
  }, [data]);

  const s = data?.summary;
  const p = data?.prev;

  const statCards = [
    {
      label: "Income",
      value: s ? formatCurrency(s.income) : "—",
      color: "var(--pos)",
      sub: s && p ? `${pctDelta(s.income, p.income)} vs last ${granLabel}` : "—",
    },
    {
      label: "Expenses",
      value: s ? formatCurrency(s.expenses) : "—",
      color: "var(--neg)",
      sub: s && p ? `${pctDelta(s.expenses, p.expenses)} vs last ${granLabel}` : "—",
    },
    {
      label: "Total Savings",
      value: s ? formatCurrency(s.savings) : "—",
      color: "var(--brand)",
      sub: s && p ? `${absDelta(s.savings, p.savings)} vs last ${granLabel}` : "—",
    },
    {
      label: "Savings Rate",
      value: s ? `${(s.savingsRate * 100).toFixed(1)}%` : "—",
      color: "var(--brand)",
      sub: s && p
        ? `${s.savingsRate >= p.savingsRate ? "Up" : "Down"} from ${(p.savingsRate * 100).toFixed(1)}% last ${granLabel}`
        : "—",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Cash " right="Flow" />}
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Period navigator */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                className="btn btn-sm btn-ghost"
                style={{ padding: "4px 8px", minWidth: 0 }}
                onClick={() => setOffset((o) => o - 1)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <span className="display-serif" style={{ fontSize: 15, minWidth: 130, textAlign: "center", whiteSpace: "nowrap" }}>
                {label.main}{label.main ? " " : ""}
                <em className="display-italic" style={{ color: "var(--brand)" }}>{label.accent}</em>
              </span>
              <button
                className="btn btn-sm btn-ghost"
                style={{ padding: "4px 8px", minWidth: 0 }}
                onClick={() => setOffset((o) => o + 1)}
                disabled={offset >= 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Granularity selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {(["month", "quarter", "year"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  className="btn btn-sm btn-ghost"
                  style={{
                    fontSize: 12.5,
                    background:  granularity === g ? "var(--brand-soft)" : undefined,
                    color:       granularity === g ? "var(--brand)"      : undefined,
                    fontWeight:  granularity === g ? 600                 : undefined,
                  }}
                  onClick={() => changeGranularity(g)}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">

        {/* 12-month trend chart */}
        <IncomeExpensesChart data={data?.chart ?? []} />

        {/* 4 stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {statCards.map(({ label, value, color, sub }) => (
            <div key={label} className="v2-card v2-card-pad">
              <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                {label}
              </div>
              <div className="display-serif" style={{ fontSize: 26, color, lineHeight: 1.1 }}>
                {value}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Sankey */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div className="display-serif" style={{ fontSize: 17 }}>
                Cash flow <em className="display-italic" style={{ color: "var(--brand)" }}>breakdown</em>
              </div>
              <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
                Where your income goes ·{" "}
                {label.main}{label.main ? " " : ""}{label.accent}
              </div>
            </div>
            <span className="muted" style={{ fontSize: 12 }}>Hover nodes for details</span>
          </div>

          {sankeyData && sankeyData.nodes.length > 1 ? (
            <div style={{ height: 420 }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 10, right: 160, bottom: 10, left: 160 }}
                sort="input"
                align="justify"
                colors={(node) => sankeyData.colorMap[node.id as string] ?? "#888"}
                nodeOpacity={1}
                nodeThickness={14}
                nodeInnerPadding={3}
                nodeSpacing={12}
                nodeBorderWidth={0}
                nodeBorderRadius={3}
                linkOpacity={0.18}
                linkHoverOpacity={0.35}
                linkContract={0}
                enableLinkGradient
                labelPosition="outside"
                labelOrientation="horizontal"
                labelPadding={12}
                labelTextColor={{ from: "color", modifiers: [["darker", 1.2]] }}
                label={(node) => {
                  const id = node.id as string;
                  const parts = id.split(" / ");
                  return parts[parts.length - 1];
                }}
                valueFormat={(v) => `CHF ${Number(v).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              />
            </div>
          ) : (
            <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="muted" style={{ fontSize: 14 }}>
                {data ? "No categorized transactions in this period." : "Loading…"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
