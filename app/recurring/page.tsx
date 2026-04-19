"use client";

import { useState } from "react";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";

type Recurring = {
  id: number;
  name: string;
  category: string;
  amount: number;
  frequency: "monthly" | "yearly" | "weekly";
  nextDate: string;
  color: string;
  icon: string;
  auto: boolean;
};

const RECURRING: Recurring[] = [
  { id: 1, name: "Netflix", category: "Entertainment", amount: -15.90, frequency: "monthly", nextDate: "2025-05-01", color: "oklch(0.48 0.18 25)", icon: "🎬", auto: true },
  { id: 2, name: "Spotify", category: "Entertainment", amount: -10.99, frequency: "monthly", nextDate: "2025-05-03", color: "oklch(0.55 0.16 155)", icon: "🎵", auto: true },
  { id: 3, name: "iCloud", category: "Subscriptions", amount: -2.99, frequency: "monthly", nextDate: "2025-05-05", color: "oklch(0.52 0.1 240)", icon: "☁️", auto: true },
  { id: 4, name: "Gym Membership", category: "Health", amount: -65.00, frequency: "monthly", nextDate: "2025-05-01", color: "oklch(0.55 0.12 200)", icon: "🏋️", auto: false },
  { id: 5, name: "Adobe CC", category: "Subscriptions", amount: -59.99, frequency: "monthly", nextDate: "2025-05-12", color: "oklch(0.52 0.15 25)", icon: "🎨", auto: true },
  { id: 6, name: "GitHub Pro", category: "Subscriptions", amount: -4.00, frequency: "monthly", nextDate: "2025-05-18", color: "oklch(0.3 0.01 240)", icon: "💻", auto: true },
  { id: 7, name: "SBB GA", category: "Transport", amount: -3860.00, frequency: "yearly", nextDate: "2026-01-01", color: "oklch(0.65 0.12 50)", icon: "🚆", auto: false },
  { id: 8, name: "Salary", category: "Income", amount: 7200.00, frequency: "monthly", nextDate: "2025-04-25", color: "oklch(0.52 0.09 155)", icon: "💰", auto: false },
  { id: 9, name: "Freelance Retainer", category: "Income", amount: 1400.00, frequency: "monthly", nextDate: "2025-05-01", color: "oklch(0.46 0.08 155)", icon: "🧾", auto: false },
];

const UPCOMING_DAYS = [
  { day: "Mon 22", items: [] as Recurring[] },
  { day: "Tue 23", items: [] as Recurring[] },
  { day: "Wed 24", items: [] as Recurring[] },
  { day: "Thu 25", items: [RECURRING[7]] },
  { day: "Fri 26", items: [] as Recurring[] },
  { day: "Sat 27", items: [] as Recurring[] },
  { day: "Sun 28", items: [] as Recurring[] },
];

function FreqBadge({ freq }: { freq: string }) {
  return (
    <span className="chip" style={{ fontSize: 11, padding: "2px 8px", textTransform: "capitalize" }}>{freq}</span>
  );
}

export default function RecurringPage() {
  const [view, setView] = useState<"list" | "calendar">("list");

  const monthlyCommitted = RECURRING
    .filter((r) => r.amount < 0 && r.frequency === "monthly")
    .reduce((s, r) => s + Math.abs(r.amount), 0);

  const income = RECURRING.filter((r) => r.amount > 0);
  const bills = RECURRING.filter((r) => r.amount < 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Re" right="curring" />}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ display: "flex", borderRadius: 8, border: "1px solid var(--hair-2)", overflow: "hidden" }}>
              {(["list", "calendar"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: "6px 14px", fontSize: 13, cursor: "pointer", border: "none",
                    background: view === v ? "var(--brand)" : "var(--surface)",
                    color: view === v ? "var(--brand-ink)" : "var(--ink-2)",
                    fontWeight: view === v ? 600 : 400,
                    textTransform: "capitalize",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <button className="btn btn-sm btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add recurring
            </button>
          </div>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { label: "Monthly committed", value: `CHF ${monthlyCommitted.toFixed(0)}`, sub: "in bills & subs", color: "var(--neg)" },
            { label: "Monthly income", value: "CHF 8,600", sub: "recurring earnings", color: "var(--pos)" },
            { label: "Active subscriptions", value: bills.length.toString(), sub: "detected automatically", color: "var(--ink)" },
            { label: "Due this week", value: "1 bill", sub: "salary on Thu 25", color: "var(--warn)" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="v2-card v2-card-pad">
              <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
              <div className="display-serif" style={{ fontSize: 24, color, lineHeight: 1.15 }}>{value}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {view === "list" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Bills & Subscriptions */}
            <div className="v2-card v2-card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="display-serif" style={{ fontSize: 17 }}>
                  Bills & <em className="display-italic" style={{ color: "var(--brand)" }}>subscriptions</em>
                </div>
                <span className="chip" style={{ fontSize: 11.5 }}>{bills.length} active</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {bills.map((r, i) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: i < bills.length - 1 ? "1px solid var(--hair)" : "none",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${r.color}1a`, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                      {r.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</span>
                        {r.auto && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 600 }}>AUTO</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span className="muted" style={{ fontSize: 12 }}>{r.category}</span>
                        <span className="muted" style={{ fontSize: 12 }}>·</span>
                        <FreqBadge freq={r.frequency} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 14, fontWeight: 700, color: "var(--neg)" }}>
                        −CHF {Math.abs(r.amount).toFixed(2)}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                        Next: {new Date(r.nextDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Income */}
            <div className="v2-card v2-card-pad">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div className="display-serif" style={{ fontSize: 17 }}>
                  Recurring <em className="display-italic" style={{ color: "var(--brand)" }}>income</em>
                </div>
                <span className="chip" style={{ fontSize: 11.5 }}>{income.length} sources</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {income.map((r, i) => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: i < income.length - 1 ? "1px solid var(--hair)" : "none",
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${r.color}1a`, display: "grid", placeItems: "center", fontSize: 18, flexShrink: 0 }}>
                      {r.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span className="muted" style={{ fontSize: 12 }}>{r.category}</span>
                        <span className="muted" style={{ fontSize: 12 }}>·</span>
                        <FreqBadge freq={r.frequency} />
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="num" style={{ fontSize: 14, fontWeight: 700, color: "var(--pos)" }}>
                        +CHF {r.amount.toFixed(2)}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                        Next: {new Date(r.nextDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary box */}
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "var(--brand-soft)" }}>
                <div className="muted" style={{ fontSize: 12 }}>Net monthly recurring</div>
                <div className="display-serif" style={{ fontSize: 22, color: "var(--brand)", marginTop: 4 }}>
                  +CHF {(income.reduce((s, r) => s + r.amount, 0) - monthlyCommitted).toFixed(0)}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>after bills and subscriptions</div>
              </div>
            </div>
          </div>
        ) : (
          /* Calendar view */
          <div className="v2-card v2-card-pad">
            <div className="display-serif" style={{ fontSize: 17, marginBottom: 16 }}>
              April <em className="display-italic" style={{ color: "var(--brand)" }}>2025</em>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {UPCOMING_DAYS.map((day) => (
                <div key={day.day} style={{
                  minHeight: 80, padding: 10, borderRadius: 10,
                  background: day.items.length > 0 ? "var(--brand-soft)" : "var(--surface-2)",
                  border: "1px solid var(--hair)",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: "var(--ink-2)" }}>{day.day}</div>
                  {day.items.map((item) => (
                    <div key={item.id} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--brand)", color: "var(--brand-ink)", fontWeight: 600, marginBottom: 3 }}>
                      {item.icon} {item.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 12, textAlign: "center" }}>
              Showing week of Apr 22 – Apr 28 · Full calendar coming soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
