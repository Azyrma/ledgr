"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/app/components/PageHeader";
import NetWorthChart from "@/app/components/NetWorthChart";
import DateFilter from "@/app/components/DateFilter";
import AccountTransactionTable from "@/app/components/AccountTransactionTable";
import TransactionFilters, { DEFAULT_FILTERS, type Filters } from "@/app/components/TransactionFilters";
import SetCategoryPopover, { buildSections, type Section } from "@/app/components/SetCategoryPopover";
import { buildCategoryDisplayMap, type CategoryDisplay, type FlatCat } from "@/lib/categories";
import { formatCurrency } from "@/lib/utils";

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

type AccountRow = { id: number; name: string; color: string | null; currency: string; exchange_rate: number };
type Tag = { id: number; name: string; color: string | null; icon: string | null; is_system: number };

type ChartData = {
  values: number[];
  monthIndices: number[];
  monthLabels: string[];
  tickIndices: number[];
  tickLabels: string[];
};

export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [dateRange, setDateRange] = useState("all");
  const [accountData, setAccountData] = useState<{ account: Account; chart: ChartData } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state (lifted so toolbar lives in PageHeader)
  const [filters, setFilters]         = useState<Filters>(DEFAULT_FILTERS);
  const [localSearch, setLocalSearch] = useState("");
  const searchTimerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data needed by TransactionFilters and AccountTransactionTable
  const [accounts, setAccounts]               = useState<AccountRow[]>([]);
  const [categoryDisplayMap, setCategoryDisplayMap] = useState<Map<string, CategoryDisplay>>(new Map());
  const [tags, setTags]                       = useState<Tag[]>([]);
  const [popoverSections, setPopoverSections] = useState<Section[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts/${id}?dateRange=${dateRange}`);
        if (!res.ok) throw new Error("Failed to fetch account data");
        setAccountData(await res.json());
      } catch (err) {
        console.error("Error fetching account data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, dateRange]);

  useEffect(() => {
    fetch("/api/accounts").then((r) => r.json()).then((data) => {
      setAccounts(Array.isArray(data) ? data.map((a: Record<string, unknown>) => ({
        id: a.id as number, name: a.name as string, color: (a.color as string) ?? null,
        currency: (a.currency as string) ?? "CHF", exchange_rate: (a.exchange_rate as number) ?? 1.0,
      })) : []);
    });
    fetch("/api/categories").then((r) => r.json()).then((data: FlatCat[]) => {
      setCategoryDisplayMap(buildCategoryDisplayMap(data));
      setPopoverSections(buildSections(data));
    });
    fetch("/api/tags").then((r) => r.json()).then((data: Tag[]) => {
      setTags(Array.isArray(data) ? data : []);
    });
  }, []);

  const handleBack = useCallback(() => { router.push("/accounts"); }, [router]);

  const activeFilterCount = [
    filters.category, filters.minAmount, filters.maxAmount,
    filters.needsReview, filters.reimbursable, filters.transfers,
  ].filter(Boolean).length;

  useEffect(() => { setLocalSearch(filters.search); }, [filters.search]);

  function handleSearchInput(val: string) {
    setLocalSearch(val);
    clearTimeout(searchTimerRef.current ?? undefined);
    searchTimerRef.current = setTimeout(
      () => setFilters((f) => ({ ...f, search: val })),
      300,
    );
  }

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
        actions={
          <>
            {(activeFilterCount > 0 || localSearch) && (
              <button
                onClick={() => { setFilters(DEFAULT_FILTERS); handleSearchInput(""); }}
                className="btn btn-sm btn-ghost"
                style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}
              >
                Clear all
              </button>
            )}
            <div style={{ position: "relative", display: "flex", alignItems: "center", width: 220 }}>
              <svg xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", left: 10, pointerEvents: "none", color: "var(--ink-4)" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search…"
                value={localSearch}
                onChange={(e) => handleSearchInput(e.target.value)}
                style={{
                  width: "100%", height: 40,
                  paddingLeft: 32, paddingRight: localSearch ? 28 : 10,
                  fontSize: 13, borderRadius: 5,
                  border: "1px solid var(--hair-2)",
                  background: "var(--surface)", color: "var(--ink)",
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "var(--hair-2)")}
              />
              {localSearch && (
                <button
                  onClick={() => handleSearchInput("")}
                  style={{ position: "absolute", right: 6, background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 2, display: "flex" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <TransactionFilters
              filters={filters}
              accounts={accounts}
              categoryDisplayMap={categoryDisplayMap}
              tags={tags}
              onChange={setFilters}
              activeFilterCount={activeFilterCount}
              hideTabs={["account"]}
            />
            <DateFilter selected={dateRange} onChange={setDateRange} />
          </>
        }
        titleExtra={
          <button onClick={handleBack} className="btn btn-ghost btn-sm" title="Back to accounts">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-9 pb-8 pt-2">
        {/* Balance card */}
        <div className="v2-card" style={{ padding: "22px 28px 0", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }}>
            <div style={{ paddingBottom: 28 }}>
              <div className="muted" style={{ fontSize: 11.5, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Balance
              </div>
              <div style={{ marginTop: 10 }}>
                <span className="display-serif num" style={{ fontSize: 40, fontWeight: 500, color: "var(--ink)" }}>
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

        <AccountTransactionTable
          accountId={Number(id)}
          dateRange={dateRange}
          filters={filters}
          accounts={accounts}
          categoryDisplayMap={categoryDisplayMap}
          tags={tags}
          popoverSections={popoverSections}
        />
      </div>
    </div>
  );
}
