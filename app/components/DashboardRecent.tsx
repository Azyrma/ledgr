import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export type RecentTransaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  account_name: string;
  account_color: string;
  currency: string;
};

export type UpcomingTransaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  account_name: string;
  currency: string;
};

function DateStamp({ date }: { date: string }) {
  const d = new Date(date + "T00:00:00");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  return (
    <div style={{ width: 44, textAlign: "center", flexShrink: 0 }}>
      <div className="muted" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em" }}>{mon}</div>
      <div className="display-serif" style={{ fontSize: 18, fontWeight: 500, lineHeight: 1.2 }}>{day}</div>
    </div>
  );
}

export function DashboardUpcoming({ upcoming }: { upcoming: UpcomingTransaction[] }) {
  return (
    <div className="v2-card v2-card-pad h-full flex flex-col">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="display-serif" style={{ fontSize: 17 }}>
          Upcoming <em className="display-italic" style={{ color: "var(--brand)" }}>· next 30 days</em>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {upcoming.length > 0 && (
          <span className="chip" style={{ fontSize: 12 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
            </svg>
            {upcoming.length} upcoming
          </span>
        )}
        <Link href="/recurring" className="btn btn-sm btn-ghost" style={{ gap: 4 }}>
          Recurring
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <div className="muted" style={{ fontSize: 13, padding: "24px 0", textAlign: "center" }}>
          No upcoming transactions
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {upcoming.map((t, i) => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 0",
              borderBottom: i < upcoming.length - 1 ? "1px solid var(--hair)" : "none",
            }}>
              <DateStamp date={t.date} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.description}
                </div>
                {t.category && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{t.category}</div>
                )}
              </div>
              <span className="num" style={{ fontSize: 14, fontWeight: 600, color: t.amount < 0 ? "var(--neg)" : "var(--pos)", whiteSpace: "nowrap" }}>
                {t.amount < 0 ? "−" : "+"}{formatCurrency(Math.abs(t.amount), t.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardRecentTransactions({ transactions }: { transactions: RecentTransaction[] }) {
  return (
    <div className="v2-card v2-card-pad h-full flex flex-col">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="display-serif" style={{ fontSize: 17 }}>
          Recent <em className="display-italic" style={{ color: "var(--brand)" }}>transactions</em>
        </div>
        <Link href="/transactions" className="btn btn-sm btn-ghost" style={{ gap: 4 }}>
          See all
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {transactions.map((t, i) => (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 0",
            borderBottom: i < transactions.length - 1 ? "1px solid var(--hair)" : "none",
          }}>
            <DateStamp date={t.date} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.description}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                {t.category && (
                  <span className="muted" style={{ fontSize: 12 }}>{t.category}</span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: t.account_color || "var(--ink-4)", display: "inline-block" }} />
                  <span className="muted" style={{ fontSize: 11.5 }}>{t.account_name}</span>
                </span>
              </div>
            </div>
            <span className="num" style={{ fontSize: 14, fontWeight: 600, color: t.amount < 0 ? "var(--neg)" : "var(--pos)", whiteSpace: "nowrap" }}>
              {t.amount < 0 ? "−" : "+"}{formatCurrency(Math.abs(t.amount), t.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
