import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type Database from "better-sqlite3";

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function getFromDate(range: string, now: Date): string {
  switch (range) {
    case "1d":  return toIso(now);
    case "7d":  return toIso(addDays(now, -7));
    case "30d": return toIso(addDays(now, -30));
    case "3m":  return toIso(new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()));
    case "12m": return toIso(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    default:    return ""; // "all"
  }
}

// Return all non-system category names that descend from rootId
function descendantNames(db: Database.Database, rootId: number): string[] {
  return (db.prepare(`
    WITH RECURSIVE tree(id, name, is_system) AS (
      SELECT id, name, is_system FROM categories WHERE parent_id = ?
      UNION ALL
      SELECT c.id, c.name, c.is_system FROM categories c JOIN tree ON c.parent_id = tree.id
    )
    SELECT name FROM tree WHERE is_system = 0
  `).all(rootId) as { name: string }[]).map((r) => r.name);
}

// Build a COALESCE(SUM(CASE WHEN category IN (...) THEN ABS(amount) ELSE 0 END), 0) expression.
// Returns the SQL fragment and the params to prepend (category names).
function catSumExpr(cats: string[], alias: string): { sql: string; params: string[] } {
  if (cats.length === 0) return { sql: `0 AS ${alias}`, params: [] };
  const ph = cats.map(() => "?").join(",");
  return {
    sql: `COALESCE(SUM(CASE WHEN category IN (${ph}) THEN ABS(amount) ELSE 0 END), 0) AS ${alias}`,
    params: cats,
  };
}

// Sum income / expenses / savings for a given WHERE clause.
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
  const exp = catSumExpr(expCats, "expenses");
  const sav = catSumExpr(savCats, "savings");

  return db.prepare(`
    SELECT ${inc.sql}, ${exp.sql}, ${sav.sql}
    FROM transactions WHERE linked_transaction_id IS NULL ${whereClause}
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
    const from  = getFromDate(dateRange, now);

    // ── Category name lists (run once) ────────────────────────────────────
    const incCats = descendantNames(db, 1); // Income
    const expCats = descendantNames(db, 2); // Expenses (Needs + Wants)
    const savCats = descendantNames(db, 5); // Savings

    // Reusable SQL fragments
    const acctTransC = accountIds.length > 0
      ? `AND account_id IN (${accountIds.map(() => "?").join(",")})`
      : "";
    const acctAcctC = accountIds.length > 0
      ? `WHERE a.id IN (${accountIds.map(() => "?").join(",")})`
      : "";
    const acctP = accountIds;

    const periodC = from ? "AND date >= ? AND date <= ?" : "AND date <= ?";
    const periodP: (string | number)[] = from ? [from, today] : [today];

    // ── Total balance (all-time, filtered accounts) ───────────────────────
    const { balance } = db.prepare(`
      SELECT COALESCE(SUM(a.initial_balance + COALESCE(t.tx_sum, 0)), 0) AS balance
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
      const diffMs   = now.getTime() - fromDate.getTime();
      prevTo   = toIso(new Date(fromDate.getTime() - 86_400_000));
      prevFrom = toIso(new Date(fromDate.getTime() - diffMs));
    }
    const prevC = prevFrom ? "AND date >= ? AND date <= ?" : "AND 1=0";
    const prevP: (string | number)[] = prevFrom ? [prevFrom, prevTo] : [];
    const prev  = sumPeriod(db, incCats, expCats, savCats, `${prevC} ${acctTransC}`, [...prevP, ...acctP]);

    // ── 12-month chart (grouped) ──────────────────────────────────────────
    const chartFrom = toIso(new Date(now.getFullYear(), now.getMonth() - 11, 1));
    const inc = catSumExpr(incCats, "income");
    const exp = catSumExpr(expCats, "expenses");
    const chartRows = db.prepare(`
      SELECT strftime('%Y-%m', date) AS ym, ${inc.sql}, ${exp.sql}
      FROM transactions
      WHERE linked_transaction_id IS NULL AND date >= ? AND date <= ? ${acctTransC}
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

    // ── This week ─────────────────────────────────────────────────────────
    const weekFrom = toIso(addDays(now, -7));
    const week = sumPeriod(db, incCats, expCats, savCats,
      `AND date >= ? AND date <= ? ${acctTransC}`, [weekFrom, today, ...acctP]);

    // ── Same period last year ─────────────────────────────────────────────
    const lyTo   = toIso(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const lyFrom = from
      ? toIso(new Date(new Date(from).setFullYear(new Date(from).getFullYear() - 1)))
      : "";
    const lyC = lyFrom ? "AND date >= ? AND date <= ?" : "AND date <= ?";
    const lyP: (string | number)[] = lyFrom ? [lyFrom, lyTo] : [lyTo];
    const ly = sumPeriod(db, incCats, expCats, savCats, `${lyC} ${acctTransC}`, [...lyP, ...acctP]);

    // ── Spending by category (expenses only, in selected period) ──────────
    const catRows = db.prepare(`
      SELECT category, COALESCE(SUM(ABS(amount)), 0) AS amount
      FROM transactions
      WHERE linked_transaction_id IS NULL AND category != '' ${periodC} ${acctTransC}
        AND category IN (${expCats.length > 0 ? expCats.map(() => "?").join(",") : "SELECT NULL WHERE 0"})
      GROUP BY category
      ORDER BY amount DESC
    `).all(...periodP, ...acctP, ...expCats) as { category: string; amount: number }[];

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
