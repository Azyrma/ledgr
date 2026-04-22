"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import NetWorthChart from "@/app/components/NetWorthChart";
import DateFilter from "@/app/components/DateFilter";
import { formatCurrency } from "@/lib/utils";
import { buildCategoryDisplayMap, type CategoryDisplay, type FlatCat } from "@/lib/categories";
import { CATEGORY_ICON_MAP } from "@/app/components/CategoryModal";

type Account = {
  id: number;
  name: string;
  type: string;
  currency: string;
  color: string;
  initial_balance: number;
  exchange_rate: number;
  balance: number;
};

type ChartData = {
  values: number[];
  monthIndices: number[];
  monthLabels: string[];
  tickIndices: number[];
  tickLabels: string[];
};

type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  account_id: number;
  account_name: string;
  account_currency: string;
  linked_transaction_id: number | null;
};

type TxWithBalance = Transaction & {
  runningBalance: number;
};

const DEFAULT_CAT_COLOR = "#A89080";

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dateRange, setDateRange] = useState("12m");
  const [accountData, setAccountData] = useState<{ account: Account; chart: ChartData } | null>(null);
  const [transactions, setTransactions] = useState<TxWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryDisplayMap, setCategoryDisplayMap] = useState<Map<string, CategoryDisplay>>(new Map());

  // Fetch account data and transactions in parallel
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [accountRes, transactionsRes, categoriesRes] = await Promise.all([
          fetch(`/api/accounts/${id}?dateRange=${dateRange}`),
          fetch(`/api/transactions?accountId=${id}&sort=date&dir=asc`),
          fetch("/api/categories"),
        ]);

        if (!accountRes.ok) {
          throw new Error("Failed to fetch account data");
        }

        const accountJson = await accountRes.json();
        setAccountData(accountJson);

        const txJson = (await transactionsRes.json()) as Transaction[];
        const categoriesJson = (await categoriesRes.json()) as FlatCat[];

        // Build category display map
        const catMap = buildCategoryDisplayMap(categoriesJson);
        setCategoryDisplayMap(catMap);

        // Compute running balance
        let running = accountJson.account.initial_balance;
        const txWithBalance: TxWithBalance[] = txJson.map((tx) => {
          running += tx.amount;
          return { ...tx, runningBalance: running };
        });

        // Reverse to show newest first
        txWithBalance.reverse();
        setTransactions(txWithBalance);
      } catch (err) {
        console.error("Error fetching data:", err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, dateRange]);

  const handleBack = useCallback(() => {
    router.push("/accounts");
  }, [router]);

  if (!accountData) {
    return (
      <div className="flex flex-col h-full">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
      </div>
    );
  }

  const { account, chart } = accountData;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={account.name}
        actions={<DateFilter selected={dateRange} onChange={setDateRange} />}
        titleExtra={
          <button
            onClick={handleBack}
            className="btn btn-ghost btn-sm"
            title="Back to accounts"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-9 pb-12 pt-2 space-y-6">
        {/* Balance card */}
        <div
          className="v2-card"
          style={{ padding: "22px 28px 0", overflow: "hidden" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 40,
              alignItems: "center",
            }}
          >
            <div style={{ paddingBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  className="muted"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Balance
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <span
                  className="display-serif num"
                  style={{
                    fontSize: 40,
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}
                >
                  {formatCurrency(account.balance, account.currency)}
                </span>
              </div>
            </div>
            <div style={{ marginRight: -28 }}>
              {chart && chart.values.length > 1 && (
                <NetWorthChart
                  values={chart.values}
                  monthIndices={chart.monthIndices}
                  monthLabels={chart.monthLabels}
                  tickIndices={chart.tickIndices}
                  tickLabels={chart.tickLabels}
                  height={120}
                  color={account.color}
                />
              )}
            </div>
          </div>
        </div>

        {/* Transaction table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="v2-card flex items-center justify-center py-12">
            <p className="text-sm text-base-content/60">No transactions</p>
          </div>
        ) : (
          <div className="v2-card">
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--surface-2)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontWeight: 600,
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontWeight: 600,
                      }}
                    >
                      Description
                    </th>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "12px 16px",
                        fontWeight: 600,
                      }}
                    >
                      Category
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 16px",
                        fontWeight: 600,
                      }}
                    >
                      Amount
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "12px 16px",
                        fontWeight: 600,
                      }}
                    >
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, idx) => {
                    const dateObj = new Date(t.date + "T00:00:00Z");
                    const dateStr = dateObj.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    });

                    // Get category display
                    let categoryDisplay: React.ReactNode = null;
                    if (t.category) {
                      const display = categoryDisplayMap.get(t.category);
                      const leafName =
                        display?.leafName ?? t.category.split(": ").pop() ?? t.category;
                      const color = display?.color ?? DEFAULT_CAT_COLOR;
                      const Icon = display?.icon ? CATEGORY_ICON_MAP[display.icon] : null;

                      categoryDisplay = (
                        <div
                          title={t.category}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            borderRadius: 9999,
                            padding: "3px 8px",
                            backgroundColor: `${color}22`,
                            border: `1px solid ${color}55`,
                          }}
                        >
                          {Icon ? (
                            <Icon
                              size={11}
                              color={color}
                              strokeWidth={2}
                              style={{ flexShrink: 0 }}
                            />
                          ) : (
                            <span
                              style={{
                                height: 8,
                                width: 8,
                                borderRadius: "50%",
                                backgroundColor: color,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {leafName}
                          </span>
                        </div>
                      );
                    } else {
                      categoryDisplay = (
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--ink-3)",
                          }}
                        >
                          —
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom:
                            idx !== transactions.length - 1
                              ? "1px solid var(--hair)"
                              : "none",
                          transition: "background-color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--surface-2)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "var(--ink-2)",
                          }}
                        >
                          {dateStr}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            maxWidth: 260,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.description}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                          }}
                        >
                          {categoryDisplay}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            textAlign: "right",
                            color: t.amount >= 0 ? "var(--pos)" : "var(--neg)",
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(t.amount, account.currency)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: 13,
                            textAlign: "right",
                            color: "var(--ink-3)",
                            fontWeight: 500,
                          }}
                        >
                          {formatCurrency(t.runningBalance, account.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
