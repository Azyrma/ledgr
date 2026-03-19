import { ACCOUNT_TYPES } from "./AccountModal";
import { formatCurrency } from "@/lib/utils";

export type Account = {
  id: number;
  name: string;
  type: string;
  currency: string;
  color: string;
  initial_balance: number;
  exchange_rate: number;
  balance: number;
  income: number;
  expenses: number;
  transaction_count: number;
};

export type Holding = {
  id: number;
  account_id: number;
  ticker: string;
  name: string;
  shares: number;
  avg_cost_per_share: number;
  currency: string;
  isin: string;
  current_price: number | null;
  price_updated_at: string | null;
  total_value: number;
  market_value: number | null;
};

type Props = {
  account: Account;
  holdings?: Holding[];
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onViewHoldings?: (account: Account) => void;
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

export default function AccountCard({ account, holdings, onEdit, onDelete, onViewHoldings }: Props) {
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;
  const isInvestment = account.type === "investment";
  const hasMarketPrices = holdings?.some((h) => h.market_value != null) ?? false;
  const portfolioValue = holdings?.reduce((sum, h) => sum + (h.market_value ?? h.total_value), 0) ?? 0;
  const costBasis = holdings?.reduce((sum, h) => sum + h.total_value, 0) ?? 0;

  return (
    <div className="card bg-base-100 border border-base-300 overflow-hidden">
      {/* Color bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: account.color }} />

      <div className="card-body gap-5 p-5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${account.color}20`, color: account.color }}>
              {TYPE_ICONS[account.type] ?? TYPE_ICONS.checking}
            </div>
            <div>
              <p className="font-semibold">{account.name}</p>
              <p className="text-xs text-base-content/50">{typeLabel} · {account.currency}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(account)} className="btn btn-ghost btn-xs" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button onClick={() => onDelete(account)} className="btn btn-ghost btn-xs text-error" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>

        {isInvestment ? (
          <>
            <div>
              <p className="text-xs text-base-content/50">
                {hasMarketPrices ? "Market value" : "Cost basis"}
              </p>
              <p className="mt-0.5 text-2xl font-bold" style={{ color: account.color }}>
                {formatCurrency(portfolioValue, account.currency)}
              </p>
              {hasMarketPrices && costBasis > 0 && (
                <p className={`mt-0.5 text-xs font-medium ${portfolioValue >= costBasis ? "text-success" : "text-error"}`}>
                  {portfolioValue >= costBasis ? "+" : ""}{formatCurrency(portfolioValue - costBasis, account.currency)}
                  {" "}({((portfolioValue - costBasis) / costBasis * 100).toFixed(1)}%)
                </p>
              )}
            </div>

            {holdings && holdings.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {holdings.slice(0, 4).map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-md bg-base-200 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{h.ticker}</span>
                      <span className="text-xs text-base-content/50">{h.shares} shares</span>
                    </div>
                    <span className="text-xs font-medium text-base-content/70">
                      {formatCurrency(h.market_value ?? h.total_value, h.currency)}
                    </span>
                  </div>
                ))}
                {holdings.length > 4 && (
                  <p className="text-xs text-base-content/50 text-center">
                    +{holdings.length - 4} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-base-content/50">No holdings yet</p>
            )}

            <button onClick={() => onViewHoldings?.(account)} className="btn btn-outline btn-sm">
              Manage holdings
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="text-xs text-base-content/50">Current balance</p>
              <p className="mt-0.5 text-2xl font-bold" style={{ color: account.balance >= 0 ? account.color : "#ef4444" }}>
                {formatCurrency(account.balance, account.currency)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-base-200 px-3 py-2.5">
                <p className="text-xs text-base-content/50">Income</p>
                <p className="mt-0.5 text-sm font-semibold text-success">
                  {formatCurrency(account.income, account.currency)}
                </p>
              </div>
              <div className="rounded-lg bg-base-200 px-3 py-2.5">
                <p className="text-xs text-base-content/50">Expenses</p>
                <p className="mt-0.5 text-sm font-semibold text-error">
                  {formatCurrency(account.expenses, account.currency)}
                </p>
              </div>
            </div>

            <p className="text-xs text-base-content/30">
              {account.transaction_count} transaction{account.transaction_count !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
