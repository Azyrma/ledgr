"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader, { SplitTitle } from "@/app/components/PageHeader";
import GoalModal, { type Goal } from "@/app/components/GoalModal";
import { formatCurrency } from "@/lib/utils";

type Contribution = { id: number; date: string; amount: number; note: string };

type GoalData = Goal & {
  created_at: string;
  saved: number;
  monthly_needed: number | null;
  contributions: Contribution[];
};

const DEFAULT_COLOR = "#6FA77A";

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Timeline: straight target line (start → target date) and cumulative actual line.
function GoalTimeline({ goal }: { goal: GoalData }) {
  const W = 320, H = 90;
  const pad = { l: 6, r: 6, t: 8, b: 8 };
  const color = goal.color ?? DEFAULT_COLOR;

  const startIso = goal.created_at.split(" ")[0];
  const todayIso = new Date().toISOString().split("T")[0];
  const endIso = [goal.target_date ?? "", todayIso].sort().pop()!;
  const t0 = new Date(startIso).getTime();
  const t1 = new Date(endIso).getTime();
  const span = Math.max(t1 - t0, 86_400_000);
  const yMax = Math.max(goal.target_amount, goal.saved, 1);

  const x = (iso: string) => pad.l + ((new Date(iso).getTime() - t0) / span) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / yMax) * (H - pad.t - pad.b);

  // Actual: cumulative contributions, carried flat to today.
  let cum = 0;
  const pts: [number, number][] = [[x(startIso), y(0)]];
  for (const c of goal.contributions) {
    if (c.date >= startIso) pts.push([x(c.date), y(cum)]);
    cum += c.amount;
    pts.push([x(c.date < startIso ? startIso : c.date), y(cum)]);
  }
  pts.push([x(todayIso), y(cum)]);
  const actualD = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
      <line x1={pad.l} y1={y(0)} x2={W - pad.r} y2={y(0)} stroke="var(--hair)" />
      {goal.target_date && (
        <line
          x1={x(startIso)} y1={y(0)}
          x2={x(goal.target_date)} y2={y(goal.target_amount)}
          stroke="var(--ink-4)" strokeWidth="1.5" strokeDasharray="4 4"
        />
      )}
      <line x1={pad.l} y1={y(goal.target_amount)} x2={W - pad.r} y2={y(goal.target_amount)} stroke="var(--hair)" strokeDasharray="2 4" />
      <path d={actualD} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ContributionModal({ goal, onClose, onSaved }: { goal: GoalData; onClose: () => void; onSaved: () => void }) {
  const [date, setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  async function handleSave() {
    if (!Number(amount)) return;
    setSaving(true);
    const res = await fetch(`/api/goals/${goal.id}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amount: Number(amount), note }),
    });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Failed to save.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="text-lg font-bold">Add contribution</h3>
        <p className="mt-1 text-sm text-base-content/60">{goal.name}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Date</legend>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input input-bordered w-full" />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend">Amount (CHF)</legend>
            <input
              type="number" step={50} value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500"
              className="input input-bordered w-full"
            />
          </fieldset>
        </div>
        <fieldset className="fieldset mt-2">
          <legend className="fieldset-legend">Note (optional)</legend>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="input input-bordered w-full" />
        </fieldset>

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={handleSave} disabled={saving || !Number(amount)} className="btn btn-primary">
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}

export default function GoalsPage() {
  const [goals, setGoals]     = useState<GoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalModal, setGoalModal] = useState<{ initial?: Goal } | null>(null);
  const [contribGoal, setContribGoal] = useState<GoalData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalData | null>(null);

  const fetchGoals = useCallback(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setGoals(d); setLoading(false); });
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/goals/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchGoals();
  }

  const totalSaved  = goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const monthlyAllocation = goals.reduce((s, g) => s + (g.monthly_needed ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Go" right="als" />}
        actions={
          <button onClick={() => setGoalModal({})} className="btn btn-sm btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New goal
          </button>
        }
      />

      <div className="flex-1 px-9 pb-12 pt-2 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <p className="text-sm font-medium text-base-content/60">No goals yet</p>
            <p className="text-xs text-base-content/40">Create a savings goal and log contributions toward it</p>
            <button onClick={() => setGoalModal({})} className="btn btn-primary btn-sm mt-2">New goal</button>
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { label: "Total saved", value: formatCurrency(totalSaved, "CHF", 0), color: "var(--pos)", sub: "across all goals" },
                { label: "Total target", value: formatCurrency(totalTarget, "CHF", 0), color: "var(--ink)", sub: "combined targets" },
                { label: "Monthly needed", value: formatCurrency(monthlyAllocation, "CHF", 0), color: "var(--brand)", sub: "to stay on schedule" },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="v2-card v2-card-pad">
                  <div className="muted" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                  <div className="display-serif num" style={{ fontSize: 24, color, lineHeight: 1.15 }}>{value}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Goal dashboards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {goals.map((g) => {
                const color = g.color ?? DEFAULT_COLOR;
                const pct = Math.min(100, Math.round((g.saved / g.target_amount) * 100));
                return (
                  <div key={g.id} className="v2-card" style={{ padding: "18px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{g.name}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                          {g.target_date ? `Target: ${formatDate(g.target_date)}` : "No target date"}
                          {" · "}{g.contributions.length} contribution{g.contributions.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button onClick={() => setGoalModal({ initial: g })} className="btn btn-ghost btn-xs" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(g)} className="btn btn-ghost btn-xs" style={{ color: "var(--neg)" }} title="Delete">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div style={{ height: 8, borderRadius: 100, background: "var(--surface-3)", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 100, background: color }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                      <div>
                        <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(g.saved, "CHF", 0)}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>saved</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div className="num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-2)" }}>{pct}%</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>complete</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="num" style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(g.target_amount, "CHF", 0)}</div>
                        <div className="muted" style={{ fontSize: 11.5 }}>goal</div>
                      </div>
                    </div>

                    {/* Timeline: dashed target line vs actual contributions */}
                    <div style={{ marginTop: 12 }}>
                      <GoalTimeline goal={g} />
                    </div>

                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-2)", flex: 1 }}>
                        <span className="muted" style={{ fontSize: 12 }}>Monthly needed </span>
                        <span className="num" style={{ fontSize: 12, fontWeight: 600, color }}>
                          {g.monthly_needed != null ? `${formatCurrency(g.monthly_needed, "CHF", 0)}/mo` : "—"}
                        </span>
                      </div>
                      <button onClick={() => setContribGoal(g)} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>
                        Add contribution
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {goalModal && (
        <GoalModal initial={goalModal.initial} onClose={() => setGoalModal(null)} onSaved={fetchGoals} />
      )}
      {contribGoal && (
        <ContributionModal goal={contribGoal} onClose={() => setContribGoal(null)} onSaved={fetchGoals} />
      )}
      {deleteTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="text-lg font-bold">Delete goal?</h3>
            <p className="mt-2 text-sm text-base-content/60">
              <span className="font-medium text-base-content">{deleteTarget.name}</span> and its{" "}
              {deleteTarget.contributions.length} contribution{deleteTarget.contributions.length !== 1 ? "s" : ""} will be permanently deleted.
            </p>
            <div className="modal-action">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDelete} className="btn btn-error">Delete</button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDeleteTarget(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
