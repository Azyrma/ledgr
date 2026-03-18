"use client";

import { useCallback, useEffect, useState } from "react";
import AccountCard, { Account, Holding } from "../components/AccountCard";
import AccountModal from "../components/AccountModal";
import HoldingsModal from "../components/HoldingsModal";

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
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Accounts</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add account
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <svg className="h-6 w-6 animate-spin text-zinc-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No accounts yet</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Add your first account to get started</p>
            <button onClick={openAdd} className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900">
              Add account
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* Regular accounts */}
            {regularAccounts.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">Accounts</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {regularAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={openEdit}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Investment accounts */}
            {investmentAccounts.length > 0 && (
              <section>
                <h2 className="mb-4 text-sm font-semibold text-zinc-500 uppercase tracking-wider dark:text-zinc-400">Investments</h2>
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

      {/* Add / Edit modal */}
      {showModal && (
        <AccountModal
          initial={editTarget ? { ...editTarget } : undefined}
          onClose={() => setShowModal(false)}
          onSaved={handleAccountSaved}
        />
      )}

      {/* Holdings modal */}
      {holdingsAccount && (
        <HoldingsModal
          account={holdingsAccount}
          onClose={() => setHoldingsAccount(null)}
          onChanged={() => { fetchAccounts(); fetchAllHoldings(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Delete account?</h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{deleteTarget.name}</span> and all its
              {deleteTarget.type === "investment" ? " holdings and" : ""} transactions will be permanently deleted.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
