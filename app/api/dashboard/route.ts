import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
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
  const ph   = cats.map(() => "?").join(",");
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
      ? `AND t.account_id IN (${accountIds.map(() => "?").join(",")})`
      : "";
    const acctAcctC = accountIds.length > 0
      ? `WHERE a.id IN (${accountIds.map(() => "?").join(",")})`
      : "";
    const acctP = accountIds;

    const periodC = from ? "AND t.date >= ? AND t.date <= ?" : "AND t.date <= ?";
    const periodP: (string | number)[] = from ? [from, to] : [to];

    // ── Total balance (all-time, filtered accounts, converted to CHF) ────
    const { balance } = db.prepare(`
      SELECT COALESCE(SUM((a.initial_balance + COALESCE(t.tx_sum, 0)) * a.exchange_rate), 0) AS balance
      FROM accounts a
      LEFT JOIN (
        SELECT account_id, SUM(amount) AS tx_sum
        FROM transactions
        GROUP BY account_id
      ) t ON t.account_id = a.id
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
        AND t.category IN (${expCats.length > 0 ? expCats.map(() => "?").join(",") : "SELECT NULL WHERE 0"})
      GROUP BY t.category
      ORDER BY amount DESC
    `).all(...periodP, ...acctP, ...expCats) as { category: string; amount: number }[];

    // ── This week ─────────────────────────────────────────────────────────
    const weekFrom = toIso(addDays(now, -7));
    const week = sumPeriod(db, incCats, expCats, savCats,
      `AND t.date >= ? AND t.date <= ? ${acctTransC}`, [weekFrom, today, ...acctP]);

    return NextResponse.json({
      summary: {
        balance,
        income:   period.income,
        expenses: period.expenses,
        savings:  period.savings,
      },
      chart,
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
      health: {
        income:                  period.income,
        expenses:                period.expenses,
        savings:                 period.savings,
        previousPeriodExpenses:  prev.expenses,
        budgetCategoriesTotal:   0,
        budgetCategoriesOnTrack: 0,
        largestExpenseCategory:  catRows[0]
          ? { name: catRows[0].category, amount: catRows[0].amount }
          : null,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}
