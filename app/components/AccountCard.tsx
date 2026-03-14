import { ACCOUNT_TYPES } from "./AccountModal";
import { formatCurrency } from "@/lib/utils";

export type Account = {
  id: number;
  name: string;
  type: string;
  currency: string;
  color: string;
  initial_balance: number;
  balance: number;
  income: number;
  expenses: number;
  transaction_count: number;
};

type Props = {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  checking: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  savings: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" /><path d="M3 21h18" /><path d="M9 10h6" /><path d="M12 7v6" />
    </svg>
  ),
  credit_card: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  investment: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

export default function AccountCard({ account, onEdit, onDelete }: Props) {
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900">
      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />

      <div className="flex flex-col gap-5 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${account.color}20`, color: account.color }}>
              {TYPE_ICONS[account.type] ?? TYPE_ICONS.checking}
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">{account.name}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{typeLabel} · {account.currency}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(account)}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              title="Edit"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(account)}
              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Balance */}
        <div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Current balance</p>
          <p className="mt-0.5 text-2xl font-bold" style={{ color: account.balance >= 0 ? account.color : "#ef4444" }}>
            {formatCurrency(account.balance, account.currency)}
          </p>
        </div>

        {/* Income / Expenses */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Income</p>
            <p className="mt-0.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(account.income, account.currency)}
            </p>
          </div>
          <div className="rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Expenses</p>
            <p className="mt-0.5 text-sm font-semibold text-red-500 dark:text-red-400">
              {formatCurrency(account.expenses, account.currency)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-300 dark:text-zinc-600">
          {account.transaction_count} transaction{account.transaction_count !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
