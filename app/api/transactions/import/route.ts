import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseFile, detectBankType } from "@/lib/parsers";
import { buildCategoryNodeMap, getCategoryPath, type FlatCat } from "@/lib/categories";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const accountId = Number(formData.get("accountId"));

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!accountId) return NextResponse.json({ error: "No account selected." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniff = buffer.subarray(0, 200).toString("utf-8");

    if (detectBankType(file.name, sniff) === "unknown") {
      return NextResponse.json(
        { error: `Unrecognised file: "${file.name}". Expected a PostFinance, Handelsbanken, or Moneydance export.` },
        { status: 400 }
      );
    }

    const transactions = await parseFile(file.name, buffer);

    const db = getDb();
    const account = db.prepare("SELECT id FROM accounts WHERE id = ?").get(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const cats = db.prepare("SELECT id, name, parent_id, is_system FROM categories").all() as FlatCat[];
    const nodeMap = buildCategoryNodeMap(cats);
    const validPaths = new Set<string>();
    nodeMap.forEach((cat, id) => { if (!cat.is_system) validPaths.add(getCategoryPath(id, nodeMap)); });
    // Duplicate check — match on date + description + amount within the same account
    type ExistingRow = { date: string; description: string; amount: number };
    const existing = db
      .prepare("SELECT date, description, amount FROM transactions WHERE account_id = ?")
      .all(accountId) as ExistingRow[];
    const existingKeys = new Set(existing.map((r) => `${r.date}|${r.description}|${r.amount}`));

    const duplicates = transactions.filter(
      (t) => existingKeys.has(`${t.date}|${t.description}|${t.amount}`)
    );

    const skipDuplicates = formData.get("skipDuplicates") === "true";
    const importAll      = formData.get("importAll")      === "true";

    // First-pass check: return duplicates for the user to review
    if (duplicates.length > 0 && !skipDuplicates && !importAll) {
      return NextResponse.json({ duplicates }, { status: 409 });
    }

    const rowsToInsert = skipDuplicates
      ? transactions.filter((t) => !existingKeys.has(`${t.date}|${t.description}|${t.amount}`))
      : transactions;

    const insert = db.prepare(
      "INSERT INTO transactions (account_id, date, description, amount, category, needs_review, import_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const insertImport = db.prepare(
      "INSERT INTO imports (filename, account_id, count) VALUES (?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof rowsToInsert) => {
      const importRecord = insertImport.run(file.name, accountId, rows.length);
      const importId = importRecord.lastInsertRowid;
      for (const t of rows) {
        const needsReview = t.category !== "" && !validPaths.has(t.category) ? 1 : 0;
        insert.run(accountId, t.date, t.description, t.amount, t.category, needsReview, importId);
      }
    });

    insertMany(rowsToInsert);

    return NextResponse.json({ imported: rowsToInsert.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
