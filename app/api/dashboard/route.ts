import { NextRequest, NextResponse } from "next/server";
import type Database from "better-sqlite3";
import { getDb, sqlPlaceholders } from "@/lib/db";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";


function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function getDateRange(range: string, now: Date): { from: string; to: string } {
  const today = toIso(now);
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed
  // last day of previous month
  const endOfLastMonth = toIso(new Date(y, m, 0));

  switch (range) {
    case "mtd":      return { from: toIso(new Date(y, m, 1)),    to: today          }; // This month
    case "1month":   return { from: toIso(new Date(y, m - 1, 1)), to: endOfLastMonth }; // Prev calendar month
    case "2month":   return { from: toIso(new Date(y, m - 2, 1)), to: endOfLastMonth }; // Last 2 complete months
    case "3month":   return { from: toIso(new Date(y, m - 3, 1)), to: endOfLastMonth }; // Last 3 complete months
    case "6month":   return { from: toIso(new Date(y, m - 6, 1)), to: endOfLastMonth }; // Last 6 complete months
    case "ytd":      return { from: toIso(new Date(y, 0, 1)),     to: today          }; // Year to date
    case "lastyear": return { from: toIso(new Date(y - 1, 0, 1)), to: toIso(new Date(y - 1, 11, 31)) }; // Prev calendar year
    case "12m":      return { from: toIso(new Date(y - 1, m, now.getDate())), to: today }; // Rolling 12 months
    default:         return { from: "",    to: today }; // "all"
  }
}

// Return all non-system category paths under rootId by traversing the in-memory nodeMap.
// avoids per-root recursive CTE queries since allCats is already loaded.
function descendantPaths(
  rootId: number,
  nodeMap: ReturnType<typeof buildCategoryNodeMap>
): string[] {
  const result: string[] = [];
  function traverse(id: number) {
    for (const child of nodeMap.get(id)?.children ?? []) {
      if (!child.is_system) result.push(getCategoryPath(child.id, nodeMap));
      traverse(child.id);
    }
  }
  traverse(rootId);
  return result;
}

// Build a SUM(CASE WHEN category IN (...) THEN <expr> ELSE 0 END) expression.
// negate=true  → uses -(t.amount * a.exchange_rate)  (expense/savings: outflows are negative, so negating gives a positive total;
//                                                      reimbursements are positive, so negating subtracts them from the total)
// negate=false → uses  (t.amount * a.exchange_rate)  (income: inflows are positive)
function catSumExpr(cats: string[], alias: string, negate = false): { sql: string; params: string[] } {
  if (cats.length === 0) return { sql: `0 AS ${alias}`, params: [] };
  const ph   = sqlPlaceholders(cats.length);
  const expr = negate ? "-(t.amount * a.exchange_rate)" : "(t.amount * a.exchange_rate)";
  return {
    sql: `COALESCE(SUM(CASE WHEN t.category IN (${ph}) THEN ${expr} ELSE 0 END), 0) AS ${alias}`,
    params: cats,
  };
}

// Sum income / expenses / savings for a given WHERE clause (applied to transactions).
// Joins accounts to access exchange_rate for CHF conversion.
// Params order: [...incomeParams, ...expensesParams, ...savingsParams, ...whereParams]
function sumPeriod(
  db: Database.Database,
  incCats: string[],
  expCats: string[],
  savCats: string[],
  whereClause: string,
  whereParams: (string | number)[]
): { income: number; expenses: number; savings: number } {
  const inc = catSumExpr(incCats, "income");
  const exp = catSumExpr(expCats, "expenses", true);
  const sav = catSumExpr(savCats, "savings",  true);

  return db.prepare(`
    SELECT ${inc.sql}, ${exp.sql}, ${sav.sql}
    FROM transactions t
    LEFT JOIN accounts a ON a.id = t.account_id
    WHERE t.linked_transaction_id IS NULL ${whereClause}
  `).get(...inc.params, ...exp.params, ...sav.params, ...whereParams) as {
    income: number; expenses: number; savings: number;
  };
}

export function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const dateRange     = searchParams.get("dateRange") ?? "30d";
    const accountIdsRaw = searchParams.get("accountIds") ?? "";
    const accountIds    = accountIdsRaw
      ? accountIdsRaw.split(",").map(Number).filter(Boolean)
      : [];

    const now   = new Date();
    const today = toIso(now);
    const { from, to } = getDateRange(dateRange, now);

    // ── Category path lists (run once, traversed in JS — no per-root CTEs) ──
    const allCats = db.prepare(`SELECT id, name, parent_id, is_system FROM categories`).all() as FlatCat[];
    const catNodeMap = buildCategoryNodeMap(allCats);
    const incCats = descendantPaths(1, catNodeMap); // Income
    const expCats = descendantPaths(2, catNodeMap); // Expenses (Needs + Wants)
    const savCats = descendantPaths(5, catNodeMap); // Savings

    // Reusable SQL fragments
    const acctTransC = accountIds.length > 0
      ? `AND t.account_id IN (${sqlPlaceholders(accountIds.length)})`
      : "";
    const acctAcctC = accountIds.length > 0
      ? `WHERE a.id IN (${sqlPlaceholders(accountIds.length)})`
      : "";
    const acctP = accountIds;

    const periodC = from ? "AND t.date >= ? AND t.date <= ?" : "AND t.date <= ?";
    const periodP: (string | number)[] = from ? [from, to] : [to];

    // ── Total balance (cash + holdings market value, converted to CHF) ──
    const { balance } = db.prepare(`
      SELECT COALESCE(SUM(
        (a.initial_balance + COALESCE(t.tx_sum, 0) + COALESCE(h.holdings_sum, 0)) * a.exchange_rate
      ), 0) AS balance
      FROM accounts a
      LEFT JOIN (
        SELECT account_id, SUM(amount) AS tx_sum
        FROM transactions
        GROUP BY account_id
      ) t ON t.account_id = a.id
      LEFT JOIN (
        SELECT account_id, SUM(shares * COALESCE(current_price, 0)) AS holdings_sum
        FROM holdings
        GROUP BY account_id
      ) h ON h.account_id = a.id
      ${acctAcctC}
    `).get(...acctP) as { balance: number };

    // ── Selected period ───────────────────────────────────────────────────
    const period = sumPeriod(db, incCats, expCats, savCats, `${periodC} ${acctTransC}`, [...periodP, ...acctP]);

    // ── Previous period (same duration, shifted back) ─────────────────────
    let prevFrom = "", prevTo = "";
    if (from) {
      const fromDate = new Date(from);
      const toDate   = new Date(to);
      const diffMs   = toDate.getTime() - fromDate.getTime();
      prevTo   = toIso(new Date(fromDate.getTime() - 86_400_000));
      prevFrom = toIso(new Date(fromDate.getTime() - diffMs - 86_400_000));
    }
    const prevC = prevFrom ? "AND t.date >= ? AND t.date <= ?" : "AND 1=0";
    const prevP: (string | number)[] = prevFrom ? [prevFrom, prevTo] : [];
    const prev  = sumPeriod(db, incCats, expCats, savCats, `${prevC} ${acctTransC}`, [...prevP, ...acctP]);

    // ── 12-month chart (grouped) ──────────────────────────────────────────
    const chartFrom = toIso(new Date(now.getFullYear(), now.getMonth() - 11, 1));
    const inc = catSumExpr(incCats, "income");
    const exp = catSumExpr(expCats, "expenses", true);
    const chartRows = db.prepare(`
      SELECT strftime('%Y-%m', t.date) AS ym, ${inc.sql}, ${exp.sql}
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL AND t.date >= ? AND t.date <= ? ${acctTransC}
      GROUP BY ym ORDER BY ym
    `).all(...inc.params, ...exp.params, chartFrom, today, ...acctP) as {
      ym: string; income: number; expenses: number;
    }[];

    const chartMap = new Map(chartRows.map((r) => [r.ym, r]));
    const chart = Array.from({ length: 12 }, (_, i) => {
      const d     = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const ym    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      const row   = chartMap.get(ym);
      return { month: label, income: row?.income ?? 0, expenses: row?.expenses ?? 0 };
    });

    // ── Daily net-worth trajectory (date-range-aware) ────────────────────
    // Parse ISO date strings as UTC to avoid local-midnight offset shifting dates by one day
    const parseUtcDate = (iso: string) => new Date(iso + "T00:00:00Z");
    const snapToMonthStart = (d: Date) =>
      new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

    let nwFrom: Date;
    if (!from) {
      // All time: snap to Jan 1 of the earliest transaction's year so year labels
      // fall exactly on data boundaries and the series starts at a clean year edge
      const earliest = db.prepare(`
        SELECT MIN(date) AS d FROM transactions
        WHERE linked_transaction_id IS NULL ${acctTransC}
      `).get(...acctP) as { d: string | null };
      if (earliest.d) {
        const d = parseUtcDate(earliest.d);
        nwFrom = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      } else {
        nwFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      }
    } else {
      nwFrom = snapToMonthStart(parseUtcDate(from));
    }

    // End of the selected range — no month-end snap so the chart ends exactly at `to`
    const nwToDate = parseUtcDate(to);

    // Backward computation must cover at least up to today so current balance is correct
    const fullEnd  = nwToDate > now ? nwToDate : now;
    const fullDays = Math.max(2, Math.round((fullEnd.getTime() - nwFrom.getTime()) / 86_400_000) + 1);
    const fullDates: string[] = Array.from({ length: fullDays }, (_, i) => toIso(addDays(nwFrom, i)));

    const dailyDeltaRows = db.prepare(`
      SELECT t.date AS day, COALESCE(SUM(t.amount * a.exchange_rate), 0) AS delta
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL ${acctTransC}
      GROUP BY day
    `).all(...acctP) as { day: string; delta: number }[];
    const dailyDeltaMap = new Map(dailyDeltaRows.map((r) => [r.day, r.delta]));

    // Future dates (after today) have no transactions → their delta is 0 → flat line at current balance
    const fullValues = new Array(fullDays).fill(0);
    let nwRunning = balance;
    for (let i = fullDays - 1; i >= 0; i--) {
      fullValues[i] = nwRunning;
      if (i > 0) nwRunning -= dailyDeltaMap.get(fullDates[i]) ?? 0;
    }

    // Clip to the snapped end date
    const clipDays = Math.max(2, Math.round((nwToDate.getTime() - nwFrom.getTime()) / 86_400_000) + 1);
    const nwDates  = fullDates.slice(0, clipDays);
    const nwValues = fullValues.slice(0, clipDays);
    const nwDays   = nwDates.length;

    // Month boundaries — used for hover snapping in the chart
    const nwMonthIndices: number[] = [];
    const nwMonthLabels: string[] = [];
    nwDates.forEach((d, i) => {
      if (d.slice(-2) === "01") {
        nwMonthIndices.push(i);
        nwMonthLabels.push(
          parseUtcDate(d).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
        );
      }
    });
    // Redistribute month positions to be evenly spaced across the chart width.
    // Calendar months have 28–31 days so raw indices produce uneven gaps; equal
    // visual spacing is more readable and ensures first/last ticks hit the edges.
    const nwN = nwMonthIndices.length;
    if (nwN === 1) {
      nwMonthIndices[0] = 0;
    } else if (nwN > 1) {
      for (let i = 0; i < nwN; i++) {
        nwMonthIndices[i] = Math.round(i * (nwDays - 1) / (nwN - 1));
      }
    }

    // X axis display ticks — evenly spaced based on the selected range
    const totalMonths = nwMonthIndices.length;
    const nwTickIndices: number[] = [];
    const nwTickLabels: string[] = [];

    if (nwDays > 365 * 2) {
      // Multi-year: label each January (or every N years if very long)
      const yearBoundaries: { idx: number; label: string }[] = [];
      nwDates.forEach((d, i) => {
        if (d.slice(5) === "01-01") yearBoundaries.push({ idx: i, label: d.slice(0, 4) });
      });
      const yStep = yearBoundaries.length > 12 ? Math.ceil(yearBoundaries.length / 5) : yearBoundaries.length > 6 ? 2 : 1;
      // Pin first tick to chart start, last tick to chart end; intermediate ticks at Jan 1
      nwTickIndices.push(0);
      nwTickLabels.push(yearBoundaries[0]?.label ?? String(nwFrom.getUTCFullYear()));
      yearBoundaries.forEach(({ idx, label }, yi) => {
        if (yi % yStep === 0 && idx !== 0) { nwTickIndices.push(idx); nwTickLabels.push(label); }
      });
      const currentYear = String(now.getFullYear());
      if (nwTickLabels[nwTickLabels.length - 1] !== currentYear) {
        nwTickIndices.push(nwDays - 1);
        nwTickLabels.push(currentYear);
      }
    } else if (totalMonths === 0) {
      // Less than one full month: show start + end as day labels
      const fmt = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric" });
      nwTickIndices.push(0, nwDays - 1);
      nwTickLabels.push(fmt(nwFrom), fmt(now));
    } else {
      // Pin first/last ticks to the chart edges (index 0 and nwDays-1) so they
      // align exactly with the Y axis and the right boundary
      nwTickIndices.push(0);
      nwTickLabels.push(nwMonthLabels[0]);
      if (totalMonths > 1) {
        nwTickIndices.push(nwDays - 1);
        nwTickLabels.push(nwMonthLabels[totalMonths - 1]);
      }
    }

    // ── Same period last year ─────────────────────────────────────────────
    const lyFrom = from
      ? toIso(new Date(new Date(from).setFullYear(new Date(from).getFullYear() - 1)))
      : "";
    const lyTo = toIso(new Date(new Date(to).setFullYear(new Date(to).getFullYear() - 1)));
    const lyC = lyFrom ? "AND t.date >= ? AND t.date <= ?" : "AND t.date <= ?";
    const lyP: (string | number)[] = lyFrom ? [lyFrom, lyTo] : [lyTo];
    const ly = sumPeriod(db, incCats, expCats, savCats, `${lyC} ${acctTransC}`, [...lyP, ...acctP]);

    // ── Spending by category (expenses only, in selected period) ──────────
    const catRows = db.prepare(`
      SELECT t.category, COALESCE(SUM(-(t.amount * a.exchange_rate)), 0) AS amount
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL AND t.category != '' ${periodC} ${acctTransC}
        AND t.category IN (${expCats.length > 0 ? sqlPlaceholders(expCats.length) : "SELECT NULL WHERE 0"})
      GROUP BY t.category
      ORDER BY amount DESC
    `).all(...periodP, ...acctP, ...expCats) as { category: string; amount: number }[];

    // ── This week (Mon–today) ─────────────────────────────────────────────
    const dow = now.getDay(); // 0=Sun … 6=Sat
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    const weekFrom = toIso(addDays(now, -daysFromMonday));
    const week = sumPeriod(db, incCats, expCats, savCats,
      `AND t.date >= ? AND t.date <= ? ${acctTransC}`, [weekFrom, today, ...acctP]);

    // ── Recent transactions (last 8, across all accounts) ─────────────────
    const recentRows = db.prepare(`
      SELECT t.id, t.date, t.description, t.amount, t.category,
             a.name AS account_name, a.color AS account_color, a.currency
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL ${acctTransC}
      ORDER BY t.date DESC, t.id DESC
      LIMIT 8
    `).all(...acctP) as {
      id: number; date: string; description: string; amount: number;
      category: string; account_name: string; account_color: string; currency: string;
    }[];

    // ── Accounts overview (cash + holdings market value per account) ──────
    const accountRows = db.prepare(`
      SELECT a.id, a.name, a.type, a.currency, a.color,
             COALESCE(a.initial_balance + SUM(t.amount), a.initial_balance)
             + COALESCE((
                 SELECT SUM(h.shares * COALESCE(h.current_price, 0))
                 FROM holdings h WHERE h.account_id = a.id
               ), 0) AS balance
      FROM accounts a
      LEFT JOIN transactions t ON t.account_id = a.id
      ${acctAcctC}
      GROUP BY a.id
      ORDER BY a.name
    `).all(...acctP) as {
      id: number; name: string; type: string; currency: string; color: string; balance: number;
    }[];

    // ── Upcoming transactions (future-dated) ──────────────────────────────
    const upcomingRows = db.prepare(`
      SELECT t.id, t.date, t.description, t.amount, t.category,
             a.name AS account_name, a.currency
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.date > ? AND t.linked_transaction_id IS NULL ${acctTransC}
      ORDER BY t.date ASC
      LIMIT 6
    `).all(today, ...acctP) as {
      id: number; date: string; description: string; amount: number;
      category: string; account_name: string; currency: string;
    }[];

    return NextResponse.json({
      summary: {
        balance,
        income:   period.income,
        expenses: period.expenses,
        savings:  period.savings,
      },
      chart,
      netWorth: {
        values: nwValues,
        monthIndices: nwMonthIndices,
        monthLabels: nwMonthLabels,
        tickIndices: nwTickIndices,
        tickLabels: nwTickLabels,
      },
      trends: {
        thisWeekExpenses:           week.expenses,
        periodIncome:               period.income,
        periodExpenses:             period.expenses,
        periodSavings:              period.savings,
        samePeriodLastYearIncome:   ly.income,
        samePeriodLastYearExpenses: ly.expenses,
        samePeriodLastYearSavings:  ly.savings,
      },
      categories: catRows.map((r) => ({ name: r.category, amount: r.amount })),
      accounts: accountRows,
      recentTransactions: recentRows,
      upcoming: upcomingRows,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}
