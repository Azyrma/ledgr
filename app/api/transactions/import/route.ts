import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseFile, detectBankType } from "@/lib/parsers";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const accountId = Number(formData.get("accountId"));

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!accountId) return NextResponse.json({ error: "No account selected." }, { status: 400 });

    if (detectBankType(file.name) === "unknown") {
      return NextResponse.json(
        { error: `Unrecognised file: "${file.name}". Expected a PostFinance or Handelsbanken export.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const transactions = await parseFile(file.name, buffer);

    const db = getDb();
    const account = db.prepare("SELECT id FROM accounts WHERE id = ?").get(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const insert = db.prepare(
      "INSERT INTO transactions (account_id, date, description, amount, category) VALUES (?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction((rows: typeof transactions) => {
      for (const t of rows) {
        insert.run(accountId, t.date, t.description, t.amount, t.category);
      }
    });

    insertMany(transactions);

    return NextResponse.json({ imported: transactions.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
