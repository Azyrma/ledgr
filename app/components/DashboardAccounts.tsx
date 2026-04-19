import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export type DashboardAccount = {
  id: number;
  name: string;
  type: string;
  currency: string;
  color: string;
  balance: number;
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  checking: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  savings: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10l9-6 9 6" /><path d="M5 10v8M19 10v8M9 10v8M15 10v8" /><path d="M3 20h18" />
    </svg>
  ),
  credit_card: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  investment: (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" />
    </svg>
  ),
};

export default function DashboardAccounts({ accounts }: { accounts: DashboardAccount[] }) {
  return (
    <div className="v2-card v2-card-pad h-full flex flex-col">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div className="display-serif" style={{ fontSize: 17 }}>Accounts</div>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{accounts.length} connected</div>
        </div>
        <Link href="/accounts" className="btn btn-sm btn-ghost" style={{ gap: 4 }}>
          Manage
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {accounts.map((a, i) => (
          <div key={a.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: i < accounts.length - 1 ? "1px solid var(--hair)" : "none",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: `${a.color}20`, color: a.color,
              display: "grid", placeItems: "center",
            }}>
              {TYPE_ICONS[a.type] ?? TYPE_ICONS.checking}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.name}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{a.currency}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="num" style={{
                fontSize: 14, fontWeight: 600,
                color: a.balance < 0 ? "var(--neg)" : "var(--ink)",
              }}>
                {formatCurrency(a.balance, a.currency)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
