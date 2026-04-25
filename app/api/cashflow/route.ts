import { NextRequest, NextResponse } from "next/server";
import type Database from "better-sqlite3";
import { getDb, sqlPlaceholders } from "@/lib/db";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

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

function catSumExpr(cats: string[], alias: string, negate = false): { sql: string; params: string[] } {
  if (cats.length === 0) return { sql: `0 AS ${alias}`, params: [] };
  const ph = sqlPlaceholders(cats.length);
  const expr = negate ? "-(t.amount * a.exchange_rate)" : "(t.amount * a.exchange_rate)";
  return {
    sql: `COALESCE(SUM(CASE WHEN t.category IN (${ph}) THEN ${expr} ELSE 0 END), 0) AS ${alias}`,
    params: cats,
  };
}

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
  const sav = catSumExpr(savCats, "savings", true);
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
    const from = searchParams.get("from") ?? "";
    const to   = searchParams.get("to")   ?? toIso(new Date());
    const accountIdsRaw = searchParams.get("accountIds") ?? "";
    const accountIds = accountIdsRaw
      ? accountIdsRaw.split(",").map(Number).filter(Boolean)
      : [];

    const allCats = db.prepare(
      `SELECT id, name, parent_id, color, icon, is_system FROM categories`
    ).all() as FlatCat[];
    const catNodeMap = buildCategoryNodeMap(allCats);

    // Income(1), Needs(3)+Wants(4) as expenses, Savings(5)
    const incCats = descendantPaths(1, catNodeMap);
    const expCats = [
      ...descendantPaths(3, catNodeMap),
      ...descendantPaths(4, catNodeMap),
    ];
    const savCats = descendantPaths(5, catNodeMap);

    const acctTransC = accountIds.length > 0
      ? `AND t.account_id IN (${sqlPlaceholders(accountIds.length)})`
      : "";
    const acctP = accountIds;

    const periodC = from ? "AND t.date >= ? AND t.date <= ?" : "AND t.date <= ?";
    const periodP: (string | number)[] = from ? [from, to] : [to];

    // ── Current period ─────────────────────────────────────────────────────────
    const period = sumPeriod(
      db, incCats, expCats, savCats,
      `${periodC} ${acctTransC}`, [...periodP, ...acctP]
    );

    // ── Previous period (same duration, immediately before) ────────────────────
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
    const prev = sumPeriod(
      db, incCats, expCats, savCats,
      `${prevC} ${acctTransC}`, [...prevP, ...acctP]
    );

    // ── 12-month chart ending at `to` ──────────────────────────────────────────
    const toDate   = new Date(to);
    const chartFrom = toIso(new Date(toDate.getFullYear(), toDate.getMonth() - 11, 1));
    const incE = catSumExpr(incCats, "income");
    const expE = catSumExpr(expCats, "expenses", true);
    const chartRows = db.prepare(`
      SELECT strftime('%Y-%m', t.date) AS ym, ${incE.sql}, ${expE.sql}
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL AND t.date >= ? AND t.date <= ? ${acctTransC}
      GROUP BY ym ORDER BY ym
    `).all(...incE.params, ...expE.params, chartFrom, to, ...acctP) as {
      ym: string; income: number; expenses: number;
    }[];

    const chartMap = new Map(chartRows.map((r) => [r.ym, r]));
    const chart = Array.from({ length: 12 }, (_, i) => {
      const d  = new Date(toDate.getFullYear(), toDate.getMonth() - 11 + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = chartMap.get(ym);
      return {
        month:    d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
        income:   row?.income   ?? 0,
        expenses: row?.expenses ?? 0,
      };
    });

    // ── Sankey: category sums then roll up into bucket → group → leaf ──────────
    const allSankeyLeafCats = [...expCats, ...savCats];
    const catAmountRows = allSankeyLeafCats.length > 0
      ? (db.prepare(`
          SELECT t.category, COALESCE(SUM(-(t.amount * a.exchange_rate)), 0) AS amount
          FROM transactions t
          LEFT JOIN accounts a ON a.id = t.account_id
          WHERE t.linked_transaction_id IS NULL ${periodC} ${acctTransC}
            AND t.category IN (${sqlPlaceholders(allSankeyLeafCats.length)})
          GROUP BY t.category
        `).all(...periodP, ...acctP, ...allSankeyLeafCats) as { category: string; amount: number }[])
      : [];

    const catAmountMap = new Map(catAmountRows.map((r) => [r.category, r.amount]));

    const BUCKET_DEFS = [
      { id: 3, key: "needs"   as const, label: "Needs"   },
      { id: 4, key: "wants"   as const, label: "Wants"   },
      { id: 5, key: "savings" as const, label: "Savings" },
    ];

    const buckets = BUCKET_DEFS.map(({ id: bucketId, key, label }) => {
      const groups: Array<{
        name: string; total: number;
        leaves: Array<{ name: string; total: number }>;
      }> = [];

      for (const groupCat of catNodeMap.get(bucketId)?.children ?? []) {
        if (groupCat.is_system) continue;
        const groupPath  = getCategoryPath(groupCat.id, catNodeMap);
        const groupNode  = catNodeMap.get(groupCat.id);
        const leaves: Array<{ name: string; total: number }> = [];
        let groupTotal = 0;

        if (groupNode && groupNode.children.length > 0) {
          for (const leafCat of groupNode.children) {
            if (leafCat.is_system) continue;
            const leafPath = getCategoryPath(leafCat.id, catNodeMap);
            const amt = catAmountMap.get(leafPath) ?? 0;
            if (amt > 0) {
              leaves.push({ name: leafCat.name, total: amt });
              groupTotal += amt;
            }
          }
          leaves.sort((a, b) => a.name.localeCompare(b.name));
        } else {
          groupTotal = catAmountMap.get(groupPath) ?? 0;
          if (groupTotal > 0) leaves.push({ name: groupCat.name, total: groupTotal });
        }

        if (groupTotal > 0) groups.push({ name: groupCat.name, total: groupTotal, leaves });
      }

      groups.sort((a, b) => a.name.localeCompare(b.name));

      const bucketTotal = groups.reduce((s, g) => s + g.total, 0);
      return { id: key, label, total: bucketTotal, groups };
    });

    const savingsRate     = period.income > 0 ? period.savings / period.income : 0;
    const prevSavingsRate = prev.income    > 0 ? prev.savings  / prev.income   : 0;

    return NextResponse.json({
      summary: {
        income:      period.income,
        expenses:    period.expenses,
        savings:     period.savings,
        savingsRate,
      },
      prev: {
        income:      prev.income,
        expenses:    prev.expenses,
        savings:     prev.savings,
        savingsRate: prevSavingsRate,
      },
      chart,
      sankey: { income: period.income, buckets },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}
