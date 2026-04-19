"use client";

import PageHeader, { SplitTitle } from "@/app/components/PageHeader";

type SaveGoal = {
  id: number;
  name: string;
  icon: string;
  color: string;
  current: number;
  target: number;
  monthly: number;
  targetDate: string;
  status: "on-track" | "ahead" | "at-risk";
};

type PayGoal = {
  id: number;
  name: string;
  icon: string;
  color: string;
  balance: number;
  originalBalance: number;
  rate: number;
  minPayment: number;
  payoffDate: string;
  interestSaved: number;
  strategy: "avalanche" | "snowball";
};

const SAVE_GOALS: SaveGoal[] = [
  {
    id: 1, name: "Emergency Fund", icon: "🛡️", color: "oklch(0.52 0.09 155)",
    current: 8400, target: 15000, monthly: 500, targetDate: "Dec 2026",
    status: "on-track",
  },
  {
    id: 2, name: "Japan Trip", icon: "✈️", color: "oklch(0.52 0.1 200)",
    current: 2800, target: 5000, monthly: 400, targetDate: "Sep 2025",
    status: "ahead",
  },
  {
    id: 3, name: "New MacBook", icon: "💻", color: "oklch(0.55 0.08 240)",
    current: 600, target: 2499, monthly: 250, targetDate: "Jun 2025",
    status: "at-risk",
  },
  {
    id: 4, name: "House Down Payment", icon: "🏠", color: "oklch(0.6 0.13 40)",
    current: 32000, target: 120000, monthly: 2000, targetDate: "Jan 2030",
    status: "on-track",
  },
];

const PAY_GOALS: PayGoal[] = [
  {
    id: 1, name: "Credit Card", icon: "💳", color: "oklch(0.52 0.12 35)",
    balance: 3200, originalBalance: 5000, rate: 14.9,
    minPayment: 80, payoffDate: "Aug 2026", interestSaved: 420, strategy: "avalanche",
  },
  {
    id: 2, name: "Car Loan", icon: "🚗", color: "oklch(0.65 0.1 50)",
    balance: 8600, originalBalance: 18000, rate: 4.5,
    minPayment: 320, payoffDate: "Mar 2028", interestSaved: 680, strategy: "snowball",
  },
];

const STATUS_CONFIG = {
  "on-track": { label: "On track", bg: "var(--pos-soft)", color: "var(--pos)" },
  "ahead":    { label: "Ahead",    bg: "var(--brand-soft)", color: "var(--brand)" },
  "at-risk":  { label: "At risk",  bg: "var(--neg-soft)", color: "var(--neg)" },
};

function ProgressBar({ pct, color, warn }: { pct: number; color: string; warn?: boolean }) {
  return (
    <div style={{ height: 8, borderRadius: 100, background: "var(--surface-3)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 100, background: warn ? "var(--warn)" : color }} />
    </div>
  );
}

export default function GoalsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Go" right="als" />}
        actions={
          <button className="btn btn-sm btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New goal
          </button>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Total saved", value: "CHF 43,800", color: "var(--pos)", sub: "across all goals" },
            { label: "Total target", value: "CHF 142,499", color: "var(--ink)", sub: "combined targets" },
            { label: "Monthly allocation", value: "CHF 3,150", color: "var(--brand)", sub: "towards goals" },
            { label: "Debt remaining", value: "CHF 11,800", color: "var(--neg)", sub: "across 2 accounts" },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="v2-card v2-card-pad">
              <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
              <div className="display-serif" style={{ fontSize: 24, color, lineHeight: 1.15 }}>{value}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Save-up goals */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="display-serif" style={{ fontSize: 17 }}>
              Save-up <em className="display-italic" style={{ color: "var(--brand)" }}>goals</em>
            </div>
            <span className="chip" style={{ fontSize: 12 }}>{SAVE_GOALS.length} active</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {SAVE_GOALS.map((g) => {
              const pct = Math.round((g.current / g.target) * 100);
              const cfg = STATUS_CONFIG[g.status];
              const remaining = g.target - g.current;
              return (
                <div key={g.id} className="v2-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${g.color}1a`, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                        {g.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Target: {g.targetDate}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 100, background: cfg.bg, color: cfg.color, fontWeight: 600, flexShrink: 0 }}>
                      {cfg.label}
                    </span>
                  </div>

                  <ProgressBar pct={pct} color={g.color} warn={g.status === "at-risk"} />

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                        CHF {g.current.toLocaleString()}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>saved</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div className="num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>
                        {pct}%
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>complete</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                        CHF {g.target.toLocaleString()}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>goal</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)", display: "flex", justifyContent: "space-between" }}>
                    <span className="muted" style={{ fontSize: 12 }}>Monthly contribution</span>
                    <span className="num" style={{ fontSize: 12, fontWeight: 600, color: g.color }}>CHF {g.monthly}/mo</span>
                  </div>

                  <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                    <span className="muted" style={{ fontSize: 11.5 }}>CHF {remaining.toLocaleString()} remaining</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pay-down goals */}
        <div className="v2-card v2-card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="display-serif" style={{ fontSize: 17 }}>
              Pay-down <em className="display-italic" style={{ color: "var(--brand)" }}>goals</em>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span className="chip" style={{ fontSize: 11.5, background: "var(--neg-soft)", color: "var(--neg)", border: "none" }}>Avalanche</span>
              <span className="chip" style={{ fontSize: 11.5 }}>Snowball</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {PAY_GOALS.map((g) => {
              const pctPaid = Math.round(((g.originalBalance - g.balance) / g.originalBalance) * 100);
              return (
                <div key={g.id} className="v2-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${g.color}1a`, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                        {g.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {g.rate}% APR · min. CHF {g.minPayment}/mo
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 100, fontWeight: 600, flexShrink: 0,
                      background: g.strategy === "avalanche" ? "var(--neg-soft)" : "var(--warn-soft)",
                      color: g.strategy === "avalanche" ? "var(--neg)" : "var(--warn)",
                    }}>
                      {g.strategy === "avalanche" ? "Avalanche" : "Snowball"}
                    </span>
                  </div>

                  <ProgressBar pct={pctPaid} color={g.color} />

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <div>
                      <div className="num" style={{ fontSize: 16, fontWeight: 700, color: "var(--neg)" }}>
                        CHF {g.balance.toLocaleString()}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>remaining</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div className="num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>
                        {pctPaid}%
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>paid off</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>
                        CHF {g.originalBalance.toLocaleString()}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5 }}>original</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)" }}>
                      <div className="muted" style={{ fontSize: 11 }}>Payoff date</div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{g.payoffDate}</div>
                    </div>
                    <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--pos-soft)" }}>
                      <div className="muted" style={{ fontSize: 11, color: "var(--pos)" }}>Interest saved</div>
                      <div className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--pos)", marginTop: 2 }}>
                        CHF {g.interestSaved}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
