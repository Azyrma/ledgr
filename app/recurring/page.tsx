"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";
import RecurringModal, { type RecurringItem } from "@/app/components/RecurringModal";
import { formatCurrency } from "@/lib/utils";

type EnrichedItem = RecurringItem & {
  match_count: number;
  last_date: string | null;
  last_amount: number | null;
  next_due: string | null;
};

type Suggestion = {
  description: string;
  count: number;
  avg_amount: number;
  frequency: string;
  last_date: string;
};

// Approximate monthly cost of one item, from its last amount and frequency.
const MONTHLY_FACTOR: Record<string, number> = { weekly: 4.33, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function FreqBadge({ freq }: { freq: string }) {
  return (
    <span className="chip" style={{ fontSize: 11, padding: "2px 8px", textTransform: "capitalize" }}>{freq}</span>
  );
}

export default function RecurringPage() {
  const [items, setItems] = useState<EnrichedItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ initial?: RecurringItem; prefill?: { title?: string; pattern?: string; frequency?: string } } | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/recurring");
    const d = await res.json();
    if (!d.error) { setItems(d.items); setSuggestions(d.suggestions); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: number) {
    await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    fetchData();
  }

  const bills  = items.filter((r) => (r.last_amount ?? 0) <= 0);
  const income = items.filter((r) => (r.last_amount ?? 0) > 0);

  const monthlyCommitted = bills.reduce(
    (s, r) => s + Math.abs(r.last_amount ?? 0) * (MONTHLY_FACTOR[r.frequency] ?? 1), 0);
  const monthlyIncome = income.reduce(
    (s, r) => s + (r.last_amount ?? 0) * (MONTHLY_FACTOR[r.frequency] ?? 1), 0);

  const today = new Date().toISOString().split("T")[0];
  const weekAhead = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0];
  const dueThisWeek = items.filter((r) => r.next_due && r.next_due >= today && r.next_due <= weekAhead);

  function renderRow(r: EnrichedItem, i: number, arr: EnrichedItem[]) {
    const amount = r.last_amount ?? 0;
    return (
      <div key={r.id} style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 0",
        borderBottom: i < arr.length - 1 ? "1px solid var(--hair)" : "none",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: "var(--brand-soft)",
          color: "var(--brand)", display: "grid", placeItems: "center",
          fontSize: 15, fontWeight: 700, flexShrink: 0,
        }}>
          {r.title.charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{r.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.pattern}
            </span>
            <FreqBadge freq={r.frequency} />
            <span className="muted" style={{ fontSize: 12 }}>· {r.match_count} matches</span>
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div className="num" style={{ fontSize: 14, fontWeight: 700, color: amount > 0 ? "var(--pos)" : "var(--neg)" }}>
            {r.last_amount != null ? formatCurrency(amount) : "—"}
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
            {r.next_due ? `Next: ${formatDate(r.next_due)}` : "No matches yet"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <button onClick={() => setModal({ initial: r })} className="btn btn-ghost btn-xs" title="Edit">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
            </svg>
          </button>
          <button onClick={() => handleDelete(r.id)} className="btn btn-ghost btn-xs" style={{ color: "var(--neg)" }} title="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Re" right="curring" />}
        actions={
          <button onClick={() => setModal({})} className="btn btn-sm btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add recurring
          </button>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {[
                { label: "Monthly committed", value: formatCurrency(monthlyCommitted, "CHF", 0), sub: "in bills & subs", color: "var(--neg)" },
                { label: "Monthly income", value: formatCurrency(monthlyIncome, "CHF", 0), sub: "recurring earnings", color: "var(--pos)" },
                { label: "Tracked items", value: String(items.length), sub: `${suggestions.length} suggestions`, color: "var(--ink)" },
                { label: "Due this week", value: String(dueThisWeek.length), sub: dueThisWeek[0] ? `${dueThisWeek[0].title} on ${formatDate(dueThisWeek[0].next_due!)}` : "nothing due", color: "var(--warn)" },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="v2-card v2-card-pad">
                  <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                  <div className="display-serif num" style={{ fontSize: 24, color, lineHeight: 1.15 }}>{value}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Bills & Subscriptions */}
              <div className="v2-card v2-card-pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="display-serif" style={{ fontSize: 17 }}>
                    Bills & <em className="display-italic" style={{ color: "var(--brand)" }}>subscriptions</em>
                  </div>
                  <span className="chip" style={{ fontSize: 11.5 }}>{bills.length} active</span>
                </div>
                {bills.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>Nothing tracked yet — add one, or pick from the suggestions.</p>
                ) : bills.map(renderRow)}
              </div>

              {/* Income */}
              <div className="v2-card v2-card-pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="display-serif" style={{ fontSize: 17 }}>
                    Recurring <em className="display-italic" style={{ color: "var(--brand)" }}>income</em>
                  </div>
                  <span className="chip" style={{ fontSize: 11.5 }}>{income.length} sources</span>
                </div>
                {income.length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>No recurring income tracked yet.</p>
                ) : income.map(renderRow)}

                {items.length > 0 && (
                  <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "var(--brand-soft)" }}>
                    <div className="muted" style={{ fontSize: 12 }}>Net monthly recurring</div>
                    <div className="display-serif num" style={{ fontSize: 22, color: "var(--brand)", marginTop: 4 }}>
                      {formatCurrency(monthlyIncome - monthlyCommitted, "CHF", 0)}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>after bills and subscriptions</div>
                  </div>
                )}
              </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="v2-card v2-card-pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div className="display-serif" style={{ fontSize: 17 }}>
                    Detected <em className="display-italic" style={{ color: "var(--brand)" }}>candidates</em>
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>regular payments found in your history</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {suggestions.map((s, i) => (
                    <div key={s.description} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                      borderBottom: i < suggestions.length - 1 ? "1px solid var(--hair)" : "none",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13 }}>{s.description}</span>
                        <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                          {s.count}× · last {formatDate(s.last_date)}
                        </span>
                      </div>
                      <FreqBadge freq={s.frequency} />
                      <span className="num" style={{ fontSize: 13, fontWeight: 600, width: 110, textAlign: "right", color: s.avg_amount > 0 ? "var(--pos)" : "var(--neg)" }}>
                        {formatCurrency(s.avg_amount)}
                      </span>
                      <button
                        onClick={() => setModal({ prefill: { title: s.description, pattern: s.description, frequency: s.frequency } })}
                        className="btn btn-outline btn-xs"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modal && (
        <RecurringModal
          initial={modal.initial}
          prefill={modal.prefill}
          onClose={() => setModal(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
