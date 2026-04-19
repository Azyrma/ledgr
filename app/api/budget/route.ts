import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Collect all descendant category path strings for a given root ID
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

// Collect all descendant category IDs (including non-system)
function descendantIds(rootId: number, nodeMap: ReturnType<typeof buildCategoryNodeMap>): number[] {
  const ids: number[] = [];
  function traverse(id: number) {
    for (const child of nodeMap.get(id)?.children ?? []) {
      ids.push(child.id);
      traverse(child.id);
    }
  }
  traverse(rootId);
  return ids;
}

// Default budget multipliers against income
const BUDGET_MULTIPLIERS: Record<string, number> = {
  Needs: 0.50,
  Wants: 0.30,
  Savings: 0.20,
};

// Category colors (matching v2 design)
const CAT_COLORS: Record<string, string> = {
  // Needs
  "Needs: Housing: Rent": "#8B7AA8",
  "Needs: Housing": "#8B7AA8",
  "Needs: Groceries": "#6FA77A",
  "Needs: Transportation": "#D4A574",
  "Needs: Transportation: Public Transportation": "#D4A574",
  "Needs: Phone": "#7FA8C0",
  "Needs: Health": "#C98B8B",
  "Needs: Education": "#6A9BB8",
  "Needs: Sports": "#7FA87F",
  "Needs: Personal Care": "#B89466",
  "Needs: Government": "#A0A0B0",
  "Needs: Miscellaneous": "#A8A8A8",
  // Wants
  "Wants: Entertainment": "#B88FC0",
  "Wants: Entertainment: Eating out": "#D49A6A",
  "Wants: Entertainment: Going out": "#B88FC0",
  "Wants: Travel": "#7FA87F",
  "Wants: Tech": "#6A8BB8",
  "Wants: Clothing": "#A88B6A",
  "Wants: Gifts": "#C9A87A",
  "Wants: Miscellaneous": "#A8A8A8",
  // Savings / Income
  "Investment": "#6A8BB8",
  "Savings: Investment": "#6A8BB8",
};

function catColor(path: string, index: number): string {
  if (CAT_COLORS[path]) return CAT_COLORS[path];
  // Fallback palette
  const palette = [
    "#6FA77A", "#8B7AA8", "#D4A574", "#7FA8C0", "#C98B8B",
    "#D49A6A", "#B88FC0", "#A88B6A", "#7FA87F", "#B89466",
    "#6A9BB8", "#C9A87A", "#8FA2C0", "#A8A8A8",
  ];
  return palette[index % palette.length];
}

export function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    // Parse year/month from query (default: current month)
    const now = new Date();
    const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to   = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Load category tree
    const allCats = db.prepare(
      `SELECT id, name, parent_id, is_system FROM categories`
    ).all() as FlatCat[];
    const nodeMap = buildCategoryNodeMap(allCats);

    // --- Income for the month ---
    const incCats = descendantPaths(1, nodeMap); // Income root = id 1
    let income = 0;
    if (incCats.length > 0) {
      const ph = incCats.map(() => "?").join(",");
      const row = db.prepare(`
        SELECT COALESCE(SUM(t.amount * a.exchange_rate), 0) AS total
        FROM transactions t
        LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.linked_transaction_id IS NULL
          AND t.date >= ? AND t.date <= ?
          AND t.category IN (${ph})
      `).get(from, to, ...incCats) as { total: number };
      income = row?.total ?? 0;
    }

    // --- Category spending per group ---
    // Needs = id 3, Wants = id 4, Savings = id 5
    const groups: Array<{
      name: string;
      rootId: number;
      color: string;
    }> = [
      { name: "Needs",   rootId: 3, color: "var(--brand)" },
      { name: "Wants",   rootId: 4, color: "var(--warn)"  },
      { name: "Savings", rootId: 5, color: "var(--info)"  },
    ];

    const result = groups.map((group) => {
      const catPaths = descendantPaths(group.rootId, nodeMap);

      // Spending for each category path in this period
      const catSpending: Record<string, number> = {};
      if (catPaths.length > 0) {
        const ph = catPaths.map(() => "?").join(",");
        const rows = db.prepare(`
          SELECT t.category, COALESCE(SUM(-(t.amount * a.exchange_rate)), 0) AS spent
          FROM transactions t
          LEFT JOIN accounts a ON a.id = t.account_id
          WHERE t.linked_transaction_id IS NULL
            AND t.date >= ? AND t.date <= ?
            AND t.category IN (${ph})
          GROUP BY t.category
        `).all(from, to, ...catPaths) as { category: string; spent: number }[];

        for (const row of rows) {
          catSpending[row.category] = row.spent;
        }
      }

      // Determine budget targets: use avg monthly spending from last 3 months as budget target
      // Fall back to % of income if no data
      const threeMonthsAgo = toIso(new Date(year, month - 4, 1));
      const lastMonthEnd   = toIso(new Date(year, month - 1, 0));

      const historicalSpend: Record<string, number> = {};
      if (catPaths.length > 0) {
        const ph = catPaths.map(() => "?").join(",");
        const histRows = db.prepare(`
          SELECT t.category, COALESCE(SUM(-(t.amount * a.exchange_rate)) / 3.0, 0) AS avg_monthly
          FROM transactions t
          LEFT JOIN accounts a ON a.id = t.account_id
          WHERE t.linked_transaction_id IS NULL
            AND t.date >= ? AND t.date <= ?
            AND t.category IN (${ph})
          GROUP BY t.category
        `).all(threeMonthsAgo, lastMonthEnd, ...catPaths) as { category: string; avg_monthly: number }[];

        for (const row of histRows) {
          historicalSpend[row.category] = row.avg_monthly;
        }
      }

      // Build category list — include any category with spending or a historical budget
      const allCatNames = new Set([
        ...Object.keys(catSpending),
        ...Object.keys(historicalSpend),
      ]);

      // Sort: highest spending first
      const sortedCats = Array.from(allCatNames).sort((a, b) => {
        const sa = catSpending[a] ?? 0;
        const sb = catSpending[b] ?? 0;
        return sb - sa;
      });

      const defaultGroupBudget = income * (BUDGET_MULTIPLIERS[group.name] ?? 0.3);

      const categories = sortedCats.map((catPath, i) => {
        const spent  = catSpending[catPath] ?? 0;
        let budget = historicalSpend[catPath];
        if (!budget || budget < 1) {
          // Fall back: equal share of group's default budget
          budget = allCatNames.size > 0
            ? defaultGroupBudget / allCatNames.size
            : defaultGroupBudget;
        }
        // Give budget at least 20% more than spent so it looks reasonable
        if (budget < spent * 0.8) budget = spent * 1.2;

        // Short display name (last segment after ": ")
        const parts = catPath.split(": ");
        const displayName = parts[parts.length - 1];

        return {
          name: displayName,
          fullPath: catPath,
          spent: Math.max(0, spent),
          budget: Math.max(1, Math.round(budget)),
          color: catColor(catPath, i),
        };
      });

      return {
        name: group.name,
        color: group.color,
        categories,
      };
    });

    return NextResponse.json({
      year,
      month,
      income,
      groups: result,
    });
  } catch (err) {
    console.error("[budget API]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}
