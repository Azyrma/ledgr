"use client";

import { useCallback, useEffect, useState } from "react";
import PageHeader, { SplitTitle } from "../components/PageHeader";
import RuleModal, { type Rule } from "../components/RuleModal";

export default function RulesPage() {
  const [rules, setRules]     = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<Rule | undefined>(undefined);

  const fetchRules = useCallback(() => {
    fetch("/api/rules")
      .then((r) => r.json())
      .then((d) => { setRules(d); setLoading(false); });
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  async function handleDelete(id: number) {
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    fetchRules();
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Ru" right="les" />}
        actions={
          <button onClick={() => { setEditTarget(undefined); setShowModal(true); }} className="btn btn-primary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add rule
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-9 pb-12 pt-2">
        <p className="mb-4 text-sm text-base-content/60">
          Rules auto-categorize imported transactions: the first rule whose pattern appears in a
          transaction&apos;s description sets its category. Applied when the bank export has no category of its own.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <p className="text-sm font-medium text-base-content/60">No rules yet</p>
            <p className="text-xs text-base-content/40">
              Add one here, or via &quot;Add rule&quot; in a transaction&apos;s category picker
            </p>
            <button onClick={() => { setEditTarget(undefined); setShowModal(true); }} className="btn btn-primary btn-sm mt-2">Add rule</button>
          </div>
        ) : (
          <div className="v2-card" style={{ padding: "6px 20px" }}>
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Description contains</th>
                  <th>Category</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium">{r.pattern}</td>
                    <td className="text-base-content/70">{r.category}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setEditTarget(r); setShowModal(true); }}
                          className="btn btn-ghost btn-xs"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="btn btn-ghost btn-xs"
                          style={{ color: "var(--neg)" }}
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <RuleModal
          initial={editTarget}
          onClose={() => setShowModal(false)}
          onSaved={fetchRules}
        />
      )}
    </div>
  );
}
