"use client";

import PageHeader, { SplitTitle } from "@/app/components/PageHeader";

type Holding = {
  ticker: string;
  name: string;
  shares: number;
  price: number;
  value: number;
  gainLoss: number;
  gainPct: number;
  color: string;
};

const HOLDINGS: Holding[] = [
  { ticker: "VT",   name: "Vanguard Total World ETF",   shares: 48.2,  price: 115.42, value: 5563, gainLoss: 842,  gainPct: 17.8, color: "oklch(0.52 0.09 155)" },
  { ticker: "VWRL", name: "Vanguard FTSE All-World",     shares: 30.0,  price: 108.60, value: 3258, gainLoss: 410,  gainPct: 14.4, color: "oklch(0.46 0.08 155)" },
  { ticker: "AAPL", name: "Apple Inc.",                  shares: 10.0,  price: 189.30, value: 1893, gainLoss: 312,  gainPct: 19.7, color: "oklch(0.55 0.08 240)" },
  { ticker: "MSFT", name: "Microsoft Corp.",             shares: 5.0,   price: 412.80, value: 2064, gainLoss: 520,  gainPct: 33.7, color: "oklch(0.52 0.1 200)" },
  { ticker: "NOVO", name: "Novartis AG",                 shares: 15.0,  price: 98.10,  value: 1472, gainLoss: -88,  gainPct: -5.6, color: "oklch(0.65 0.1 50)" },
  { ticker: "NESN", name: "Nestlé SA",                   shares: 20.0,  price: 89.20,  value: 1784, gainLoss: -210, gainPct: -10.5, color: "oklch(0.6 0.13 40)" },
  { ticker: "Cash", name: "Cash & equivalents",          shares: 1,     price: 2412,   value: 2412, gainLoss: 0,    gainPct: 0, color: "var(--ink-4)" },
];

const ALLOCATION = [
  { label: "ETFs",       pct: 46, color: "oklch(0.52 0.09 155)" },
  { label: "US Stocks",  pct: 21, color: "oklch(0.52 0.1 200)" },
  { label: "CH Stocks",  pct: 18, color: "oklch(0.6 0.13 40)" },
  { label: "Cash",       pct: 12, color: "var(--ink-4)" },
  { label: "Other",      pct: 3,  color: "oklch(0.65 0.12 310)" },
];

const PERF = [18446, 19200, 17800, 21300, 22000, 20400, 23100, 24600, 22800, 25100, 26900, 18446];
const PERF_LABELS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

function PerfChart() {
  const W = 600, H = 110;
  const pad = { l: 56, r: 8, t: 10, b: 22 };
  const iW = W - pad.l - pad.r, iH = H - pad.t - pad.b;
  const n = PERF.length;
  const max = Math.max(...PERF);
  const min = Math.min(...PERF) * 0.95;
  const range = max - min;
  const pts: [number, number][] = PERF.map((v, i) => [
    pad.l + (i / (n - 1)) * iW,
    pad.t + iH - ((v - min) / range) * iH,
  ]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const fill = `${d} L${pts[n-1][0]},${H-pad.b} L${pts[0][0]},${H-pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="invGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[min, (min + max) / 2, max].map((v, i) => {
        const y = pad.t + iH - ((v - min) / range) * iH;
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--hair)" strokeDasharray={i === 0 ? "" : "2 4"} />
            <text x={pad.l - 6} y={y + 3.5} fontSize="10" fill="var(--ink-3)" textAnchor="end" fontFamily="'JetBrains Mono', monospace">
              {Math.round(v / 1000)}k
            </text>
          </g>
        );
      })}
      <path d={fill} fill="url(#invGrad)" />
      <path d={d} stroke="var(--brand)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {PERF_LABELS.map((lab, i) => {
        if ((n - 1 - i) % 2 !== 0) return null;
        const x = pad.l + (i / (n - 1)) * iW;
        const anchor = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
        return <text key={i} x={x} y={H - 5} fontSize="10" fill="var(--ink-3)" textAnchor={anchor}>{lab}</text>;
      })}
    </svg>
  );
}

function DonutChart() {
  const cx = 60, cy = 60, r = 48, strokeW = 18;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {ALLOCATION.map((seg) => {
        const dash = (seg.pct / 100) * circumference;
        const gap = circumference - dash;
        const el = (
          <circle
            key={seg.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink)" fontFamily="'JetBrains Mono', monospace">18.4k</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="9" fill="var(--ink-3)">CHF total</text>
    </svg>
  );
}

export default function InvestmentsPage() {
  const totalValue = HOLDINGS.reduce((s, h) => s + h.value, 0);
  const totalGain  = HOLDINGS.reduce((s, h) => s + h.gainLoss, 0);
  const gainPct    = ((totalGain / (totalValue - totalGain)) * 100).toFixed(1);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Invest" right="ments" />}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <select className="btn btn-sm" style={{ fontSize: 13, cursor: "pointer" }}>
              <option>All accounts</option>
              <option>IBKR Brokerage</option>
              <option>3a Pillar</option>
            </select>
            <select className="btn btn-sm" style={{ fontSize: 13, cursor: "pointer" }}>
              <option>Last 12 months</option>
              <option>YTD</option>
              <option>All time</option>
            </select>
          </div>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {/* Hero + allocation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
          <div className="v2-card v2-card-pad">
            <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Total portfolio value</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
              <div className="display-serif" style={{ fontSize: 40, lineHeight: 1 }}>
                CHF {totalValue.toLocaleString()}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 100, background: "var(--pos-soft)", color: "var(--pos)", fontSize: 13, fontWeight: 700 }}>
                +{gainPct}% ↑
              </div>
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              +CHF {totalGain.toLocaleString()} all-time gain
            </div>
            <PerfChart />
          </div>

          <div className="v2-card v2-card-pad">
            <div className="display-serif" style={{ fontSize: 17, marginBottom: 14 }}>
              Asset <em className="display-italic" style={{ color: "var(--brand)" }}>allocation</em>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <DonutChart />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                {ALLOCATION.map((seg) => (
                  <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5 }}>{seg.label}</span>
                    </div>
                    <span className="num" style={{ fontSize: 12.5, fontWeight: 600 }}>{seg.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--pos-soft)" }}>
                <div className="muted" style={{ fontSize: 10.5, color: "var(--pos)" }}>Total gain</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: "var(--pos)", marginTop: 2 }}>
                  +CHF {totalGain.toLocaleString()}
                </div>
              </div>
              <div style={{ padding: "8px 10px", borderRadius: 8, background: "var(--surface-2)" }}>
                <div className="muted" style={{ fontSize: 10.5 }}>Cost basis</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                  CHF {(totalValue - totalGain).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Holdings table */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="display-serif" style={{ fontSize: 17 }}>
              Holdings <em className="display-italic" style={{ color: "var(--brand)" }}>detail</em>
            </div>
            <span className="chip" style={{ fontSize: 12 }}>{HOLDINGS.length} positions</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Ticker", "Name", "Shares", "Price", "Value", "Gain / Loss", ""].map((h, i) => (
                  <th key={h + i} style={{
                    textAlign: i <= 1 ? "left" : "right",
                    fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                    color: "var(--ink-3)", fontWeight: 500,
                    paddingBottom: 10, borderBottom: "1px solid var(--hair)",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((h, i) => (
                <tr key={h.ticker} style={{ borderBottom: i < HOLDINGS.length - 1 ? "1px solid var(--hair)" : "none" }}>
                  <td style={{ padding: "10px 0" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: h.color, display: "inline-block" }} />
                      <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{h.ticker}</span>
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px 10px 0", fontSize: 13, color: "var(--ink-2)" }}>{h.name}</td>
                  <td className="num" style={{ textAlign: "right", fontSize: 13, padding: "10px 0" }}>{h.shares}</td>
                  <td className="num" style={{ textAlign: "right", fontSize: 13, padding: "10px 0" }}>
                    {h.ticker === "Cash" ? "—" : `${h.price.toFixed(2)}`}
                  </td>
                  <td className="num" style={{ textAlign: "right", fontSize: 13, fontWeight: 600, padding: "10px 0" }}>
                    CHF {h.value.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 0" }}>
                    {h.gainLoss !== 0 ? (
                      <span style={{
                        fontSize: 12.5, fontWeight: 600,
                        color: h.gainLoss > 0 ? "var(--pos)" : "var(--neg)",
                      }}>
                        {h.gainLoss > 0 ? "+" : ""}CHF {h.gainLoss} ({h.gainPct > 0 ? "+" : ""}{h.gainPct}%)
                      </span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 0", paddingLeft: 8 }}>
                    <div style={{ height: 6, width: `${(h.value / totalValue) * 120}px`, background: h.color, borderRadius: 100, marginLeft: "auto", minWidth: 4 }} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--hair)" }}>
                <td colSpan={4} style={{ padding: "10px 0", fontSize: 13, fontWeight: 600 }}>Total</td>
                <td className="num" style={{ textAlign: "right", fontSize: 14, fontWeight: 700, padding: "10px 0" }}>
                  CHF {totalValue.toLocaleString()}
                </td>
                <td style={{ textAlign: "right", padding: "10px 0" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--pos)" }}>
                    +CHF {totalGain.toLocaleString()} (+{gainPct}%)
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
