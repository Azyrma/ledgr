"use client";

import { useCallback, useEffect, useState } from "react";
import AccountCard, { Account, Holding } from "../components/AccountCard";
import AccountModal from "../components/AccountModal";
import HoldingsModal from "../components/HoldingsModal";
import PageHeader, { SplitTitle } from "../components/PageHeader";
import NetWorthChart from "../components/NetWorthChart";
import DateFilter from "../components/DateFilter";
import { formatCurrency } from "@/lib/utils";

type NetWorthData = {
  balance: number;
  values: number[];
  monthIndices: number[];
  monthLabels: string[];
  tickIndices: number[];
  tickLabels: string[];
};

type EditTarget = Account | null;

export default function AccountsPage() {
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);
  const [deleting, setDeleting]     = useState(false);
  const [holdingsAccount, setHoldingsAccount] = useState<Account | null>(null);
  const [holdingsMap, setHoldingsMap] = useState<Record<number, Holding[]>>({});
  const [nwDateRange, setNwDateRange] = useState("12m");
  const [nwData, setNwData]           = useState<NetWorthData | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/accounts");
    setAccounts(await res.json());
    setLoading(false);
  }, []);

  const fetchAllHoldings = useCallback(async () => {
    const res = await fetch("/api/holdings");
    const all: Holding[] = await res.json();
    const map: Record<number, Holding[]> = {};
    for (const h of all) {
      (map[h.account_id] ??= []).push(h);
    }
    setHoldingsMap(map);
  }, []);

  useEffect(() => { fetchAccounts(); fetchAllHoldings(); }, [fetchAccounts, fetchAllHoldings]);

  useEffect(() => {
    fetch(`/api/net-worth?dateRange=${nwDateRange}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setNwData(d); });
  }, [nwDateRange]);

  function openAdd() { setEditTarget(null); setShowModal(true); }
  function openEdit(account: Account) { setEditTarget(account); setShowModal(true); }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/accounts/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    setDeleting(false);
    fetchAccounts();
    fetchAllHoldings();
  }

  function handleAccountSaved() {
    fetchAccounts();
    fetchAllHoldings();
  }

  const regularAccounts = accounts.filter((a) => a.type !== "investment");
  const investmentAccounts = accounts.filter((a) => a.type === "investment");

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={<SplitTitle left="Acc" right="ounts" />}
        actions={
          <>
            <DateFilter selected={nwDateRange} onChange={setNwDateRange} />
            <button onClick={openAdd} className="btn btn-primary btn-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add account
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto px-9 pb-12 pt-2 space-y-6">
        {/* Net Worth card */}
        <div className="v2-card" style={{ padding: "22px 28px 0", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }}>
            <div style={{ paddingBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Net Worth
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <span className="display-serif num" style={{ fontSize: 40, fontWeight: 500, color: "var(--ink)" }}>
                  {nwData ? formatCurrency(nwData.balance) : "—"}
                </span>
              </div>
            </div>
            <div style={{ marginRight: -28 }}>
              {nwData && nwData.values.length > 1 && (
                <NetWorthChart
                  values={nwData.values}
                  monthIndices={nwData.monthIndices}
                  monthLabels={nwData.monthLabels}
                  tickIndices={nwData.tickIndices}
                  tickLabels={nwData.tickLabels}
                  height={120}
                />
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-base-content/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-base-content/60">No accounts yet</p>
            <p className="text-xs text-base-content/40">Add your first account to get started</p>
            <button onClick={openAdd} className="btn btn-primary btn-sm mt-2">Add account</button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {regularAccounts.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold text-base-content/50 uppercase tracking-wider">Accounts</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {regularAccounts.map((account) => (
                    <AccountCard key={account.id} account={account} onEdit={openEdit} onDelete={setDeleteTarget} />
                  ))}
                </div>
              </section>
            )}

            {investmentAccounts.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold text-base-content/50 uppercase tracking-wider">Investments</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {investmentAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      holdings={holdingsMap[account.id]}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                      onViewHoldings={setHoldingsAccount}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <AccountModal
          initial={editTarget ? { ...editTarget } : undefined}
          onClose={() => setShowModal(false)}
          onSaved={handleAccountSaved}
        />
      )}

      {holdingsAccount && (
        <HoldingsModal
          account={holdingsAccount}
          onClose={() => setHoldingsAccount(null)}
          onChanged={() => { fetchAccounts(); fetchAllHoldings(); }}
        />
      )}

      {deleteTarget && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-sm">
            <h3 className="text-lg font-bold">Delete account?</h3>
            <p className="mt-2 text-sm text-base-content/60">
              <span className="font-medium text-base-content">{deleteTarget.name}</span> and all its
              {deleteTarget.type === "investment" ? " holdings and" : ""} transactions will be permanently deleted.
            </p>
            <div className="modal-action">
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-error">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop"><button onClick={() => setDeleteTarget(null)}>close</button></form>
        </dialog>
      )}
    </div>
  );
}
