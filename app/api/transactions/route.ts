import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search      = searchParams.get("search")      ?? "";
    const from        = searchParams.get("from")        ?? "";
    const to          = searchParams.get("to")          ?? "";
    const accountId   = searchParams.get("accountId")   ?? "";
    const category    = searchParams.get("category")    ?? "";
    const minAmount   = searchParams.get("minAmount")   ?? "";
    const maxAmount   = searchParams.get("maxAmount")   ?? "";
    const needsReview = searchParams.get("needsReview") === "true";
    const sortField   = searchParams.get("sort") ?? "date";
    const sortDir     = searchParams.get("dir")  === "asc" ? "ASC" : "DESC";

    const SORTABLE: Record<string, string> = {
      date: "t.date", description: "t.description",
      account: "a.name", category: "t.category", amount: "t.amount",
    };
    const orderCol = SORTABLE[sortField] ?? "t.date";

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search)      { conditions.push("LOWER(t.description) LIKE ?"); params.push(`%${search.toLowerCase()}%`); }
    if (from)        { conditions.push("t.date >= ?");                  params.push(from); }
    if (to)          { conditions.push("t.date <= ?");                  params.push(to); }
    if (accountId)   { conditions.push("t.account_id = ?");             params.push(Number(accountId)); }
    if (category)    { conditions.push("t.category = ?");               params.push(category); }
    if (minAmount)   { conditions.push("t.amount >= ?");                params.push(Number(minAmount)); }
    if (maxAmount)   { conditions.push("t.amount <= ?");                params.push(Number(maxAmount)); }
    if (needsReview) { conditions.push("(t.category IS NULL OR t.category = '')"); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const db = getDb();
    const rows = db.prepare(`
      SELECT
        t.id,
        t.date,
        t.description,
        t.amount,
        t.category,
        t.reimbursable,
        t.account_id,
        t.linked_transaction_id,
        a.name  AS account_name,
        a.color AS account_color
      FROM transactions t
      LEFT JOIN accounts a ON a.id = t.account_id
      ${where}
      ORDER BY ${orderCol} ${sortDir}, t.id ${sortDir}
    `).all(...params);

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { date, description, accountId, category, amount } = await request.json();

    if (!date || !description || !accountId || amount === undefined) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const db = getDb();
    const account = db.prepare("SELECT id FROM accounts WHERE id = ?").get(accountId);
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const result = db
      .prepare("INSERT INTO transactions (account_id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)")
      .run(accountId, date, description, amount, category ?? "");

    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
