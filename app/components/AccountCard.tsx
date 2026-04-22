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
  sparkline?: number[];
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
  periodLabel?: string;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
  onViewHoldings?: (account: Account) => void;
  onView?: (account: Account) => void;
};

// MiniSpark: simple SVG polyline sparkline
function MiniSpark({
  values,
  height = 38,
  color = "#888",
}: {
  values: number[];
  height?: number;
  color?: string;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const n = values.length;
  const width = 300; // will be overridden by SVG 100% width via viewBox

  const pts = values.map((v, i) => [
    (i / (n - 1)) * (width - 4) + 2,
    height - 4 - ((v - min) / range) * (height - 8),
  ]);

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const fillD = `${d} L${(width - 2).toFixed(1)},${height} L2,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <path d={fillD} fill={color} opacity="0.12" />
      <path d={d} stroke={color} strokeWidth="1.75" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}


const TYPE_ICONS: Record<string, React.ReactNode> = {
  checking: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  savings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" /><path d="M3 21h18" /><path d="M9 10h6" /><path d="M12 7v6" />
    </svg>
  ),
  credit_card: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  investment: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
};

export default function AccountCard({ account, holdings, periodLabel = "all time", onEdit, onDelete, onViewHoldings, onView }: Props) {
  const typeLabel = ACCOUNT_TYPES.find((t) => t.value === account.type)?.label ?? account.type;
  const isInvestment = account.type === "investment";
  const hasMarketPrices = holdings?.some((h) => h.market_value != null) ?? false;
  const portfolioValue = holdings?.reduce((sum, h) => sum + (h.market_value ?? h.total_value), 0) ?? 0;
  const costBasis = holdings?.reduce((sum, h) => sum + h.total_value, 0) ?? 0;

  const sparkValues = account.sparkline ?? [];

  return (
    <div
      className="v2-card v2-card-hover"
      style={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: onView ? "pointer" : "default",
      }}
      onClick={() => onView?.(account)}
    >
      {/* Color bar */}
      <div style={{ height: 4, background: account.color, flexShrink: 0 }} />

      <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `${account.color}1c`, color: account.color,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              {TYPE_ICONS[account.type] ?? TYPE_ICONS.checking}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{account.name}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{typeLabel} · {account.currency}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <button onClick={() => onEdit(account)} className="btn btn-ghost btn-xs" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button onClick={() => onDelete(account)} className="btn btn-ghost btn-xs" style={{ color: "var(--neg)" }} title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </div>
        </div>

        {isInvestment ? (
          <>
            <div style={{ marginTop: 16 }}>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {hasMarketPrices ? "Market value" : "Cost basis"}
              </div>
              <div style={{ marginTop: 4, fontSize: 24, fontWeight: 700, color: account.color }}>
                {formatCurrency(portfolioValue, account.currency)}
              </div>
              {hasMarketPrices && costBasis > 0 && (
                <div style={{ marginTop: 2, fontSize: 12, fontWeight: 500, color: portfolioValue >= costBasis ? "var(--pos)" : "var(--neg)" }}>
                  {portfolioValue >= costBasis ? "+" : ""}{formatCurrency(portfolioValue - costBasis, account.currency)}
                  {" "}({((portfolioValue - costBasis) / costBasis * 100).toFixed(1)}%)
                </div>
              )}
            </div>

            {/* Sparkline */}
            <div style={{ marginTop: 14, marginLeft: -6, marginRight: -6 }}>
              <MiniSpark values={sparkValues} height={38} color={account.color} />
            </div>

            {holdings && holdings.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {holdings.slice(0, 4).map((h) => (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: 8, background: "var(--surface-2)", padding: "6px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{h.ticker}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{h.shares} shares</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)" }}>
                      {formatCurrency(h.market_value ?? h.total_value, h.currency)}
                    </span>
                  </div>
                ))}
                {holdings.length > 4 && (
                  <p className="muted" style={{ fontSize: 12, textAlign: "center" }}>
                    +{holdings.length - 4} more
                  </p>
                )}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>No holdings yet</p>
            )}

            <button onClick={() => onViewHoldings?.(account)} className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>
              Manage holdings
            </button>
          </>
        ) : (
          <>
            {/* Balance */}
            <div style={{ marginTop: 16 }}>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {account.type === "credit_card" ? "Current balance" : "Available"}
              </div>
              <div style={{ marginTop: 4 }}>
                <span className="display-serif num" style={{ fontSize: 24, fontWeight: 500, color: account.balance >= 0 ? "var(--ink)" : "var(--neg)" }}>
                  {formatCurrency(account.balance, account.currency)}
                </span>
              </div>
            </div>

            {/* Sparkline */}
            <div style={{ marginTop: 14, marginLeft: -6, marginRight: -6 }}>
              <MiniSpark values={sparkValues} height={38} color={account.color} />
            </div>

            {/* Income / Expenses / Transactions */}
            <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--hair)" }}>
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 11 }}>In · {periodLabel}</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--pos)", marginTop: 1 }}>
                  {formatCurrency(account.income, account.currency)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 11 }}>Out · {periodLabel}</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--neg)", marginTop: 1 }}>
                  {formatCurrency(account.expenses, account.currency)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="muted" style={{ fontSize: 11 }}>Transactions</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>
                  {account.transaction_count}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
