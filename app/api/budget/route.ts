import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";

export const dynamic = "force-dynamic";

const GROUPS = [
  { name: "Income",  rootId: 1 },
  { name: "Needs",   rootId: 3 },
  { name: "Wants",   rootId: 4 },
  { name: "Savings", rootId: 5 },
];

type Leaf = { path: string; name: string; depth: number; color: string | null; parent: boolean };

// All non-system leaf categories under a root, in tree order, with inherited color.
function collectLeaves(
  rootId: number,
  nodeMap: ReturnType<typeof buildCategoryNodeMap>,
  depth = 0,
  inheritedColor: string | null = null,
): Leaf[] {
  const node = nodeMap.get(rootId);
  if (!node) return [];
  if (node.is_system) {
    return node.children.flatMap((c) => collectLeaves(c.id, nodeMap, depth, inheritedColor));
  }
  const color = node.color ?? inheritedColor;
  const userChildren = node.children.filter((c) => !c.is_system);
  if (userChildren.length === 0) {
    return [{ path: getCategoryPath(rootId, nodeMap), name: node.name, depth, color, parent: false }];
  }
  // Parent row (read-only, rolled-up totals) followed by its children
  return [
    { path: getCategoryPath(rootId, nodeMap), name: node.name, depth, color, parent: true },
    ...userChildren.flatMap((c) => collectLeaves(c.id, nodeMap, depth + 1, color)),
  ];
}

export function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    const from = `${ym}-01`;
    const to   = `${ym}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

    const cats = db.prepare("SELECT id, name, parent_id, color, icon, is_system FROM categories").all() as FlatCat[];
    const nodeMap = buildCategoryNodeMap(cats);

    // Actuals: CHF sums per category path for the month, transfers excluded.
    const actualRows = db.prepare(`
      SELECT t.category, COALESCE(SUM(t.amount * a.exchange_rate), 0) AS total
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL AND t.date >= ? AND t.date <= ?
      GROUP BY t.category
    `).all(from, to) as { category: string; total: number }[];
    const actualMap = new Map(actualRows.map((r) => [r.category, r.total]));

    // Effective budget per category: the row with the latest month <= the viewed
    // month (a budget rolls forward until a later month overrides it).
    const budgetRows = db.prepare(`
      SELECT b.category, b.amount FROM budgets b
      WHERE b.month = (SELECT MAX(month) FROM budgets WHERE category = b.category AND month <= ?)
    `).all(ym) as { category: string; amount: number }[];
    const budgetMap = new Map(budgetRows.map((r) => [r.category, r.amount]));

    const groups = GROUPS.map((g) => {
      const leaves = collectLeaves(g.rootId, nodeMap).map((leaf) => {
        const raw = actualMap.get(leaf.path) ?? 0;
        // Income is naturally positive; expenses/savings are outflows — show as positive.
        const actual = g.rootId === 1 ? raw : -raw;
        const budget = budgetMap.get(leaf.path) ?? 0;
        return { ...leaf, budget, actual, remaining: budget - actual };
      });
      // Parents roll up their subtree (plus transactions filed directly on the parent path)
      for (let i = 0; i < leaves.length; i++) {
        if (!leaves[i].parent) continue;
        for (let j = i + 1; j < leaves.length && leaves[j].depth > leaves[i].depth; j++) {
          if (leaves[j].parent) continue;
          leaves[i].budget += leaves[j].budget;
          leaves[i].actual += leaves[j].actual;
        }
        leaves[i].remaining = leaves[i].budget - leaves[i].actual;
      }
      return { name: g.name, leaves };
    });

    return NextResponse.json({ year, month, groups });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { category, month, amount } = await request.json();
    if (!category || !/^\d{4}-\d{2}$/.test(month ?? "") || typeof amount !== "number" || amount < 0)
      return NextResponse.json({ error: "category, month (YYYY-MM) and amount >= 0 required." }, { status: 400 });

    const db = getDb();
    db.prepare(`
      INSERT INTO budgets (category, month, amount) VALUES (?, ?, ?)
      ON CONFLICT(category, month) DO UPDATE SET amount = excluded.amount
    `).run(category, month, amount);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
