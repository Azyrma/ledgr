import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const FREQUENCIES: string[] = ["weekly", "monthly", "quarterly", "yearly"];
const FREQ_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 91, yearly: 365 };
// Median-gap bands for guessing a frequency from transaction history.
const FREQ_BANDS: [string, number, number][] = [
  ["weekly", 5, 10],
  ["monthly", 24, 38],
  ["quarterly", 75, 110],
  ["yearly", 330, 400],
];

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export function GET() {
  try {
    const db = getDb();
    const items = db.prepare("SELECT id, title, pattern, frequency FROM recurring ORDER BY id").all() as
      { id: number; title: string; pattern: string; frequency: string }[];

    // Enrich each item from its matching transactions (case-insensitive substring).
    const enriched = items.map((item) => {
      const rows = db.prepare(`
        SELECT t.date, t.amount * a.exchange_rate AS chf
        FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
        WHERE t.linked_transaction_id IS NULL
          AND instr(lower(t.description), lower(?)) > 0
        ORDER BY t.date DESC LIMIT 24
      `).all(item.pattern) as { date: string; chf: number }[];
      const last = rows[0];
      return {
        ...item,
        match_count: rows.length,
        last_date: last?.date ?? null,
        last_amount: last?.chf ?? null,
        next_due: last ? addDays(last.date, FREQ_DAYS[item.frequency] ?? 30) : null,
      };
    });

    // Auto-detect suggestions: descriptions with >= 3 dated occurrences whose
    // median gap falls in a known frequency band, not already covered by an item.
    const candidates = db.prepare(`
      SELECT t.description, COUNT(*) AS n,
             GROUP_CONCAT(t.date) AS dates,
             AVG(t.amount * a.exchange_rate) AS avg_chf,
             MAX(t.date) AS last_date
      FROM transactions t LEFT JOIN accounts a ON a.id = t.account_id
      WHERE t.linked_transaction_id IS NULL AND t.description != ''
      GROUP BY t.description
      HAVING n >= 3
    `).all() as { description: string; n: number; dates: string; avg_chf: number; last_date: string }[];

    const covered = (desc: string) =>
      items.some((i) => desc.toLowerCase().includes(i.pattern.toLowerCase()));

    const suggestions = candidates
      .filter((c) => !covered(c.description))
      .flatMap((c) => {
        const dates = c.dates.split(",").sort();
        const gaps = dates.slice(1).map((d, i) =>
          (new Date(d).getTime() - new Date(dates[i]).getTime()) / 86_400_000);
        const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
        const band = FREQ_BANDS.find(([, lo, hi]) => median >= lo && median <= hi);
        if (!band) return [];
        return [{
          description: c.description,
          count: c.n,
          avg_amount: c.avg_chf,
          frequency: band[0],
          last_date: c.last_date,
        }];
      })
      .sort((a, b) => b.last_date.localeCompare(a.last_date))
      .slice(0, 12);

    return NextResponse.json({ items: enriched, suggestions });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, pattern, frequency } = await request.json();
    if (!title?.trim() || !pattern?.trim())
      return NextResponse.json({ error: "Title and pattern are required." }, { status: 400 });
    if (!FREQUENCIES.includes(frequency))
      return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });

    const db = getDb();
    const result = db.prepare("INSERT INTO recurring (title, pattern, frequency) VALUES (?, ?, ?)")
      .run(title.trim(), pattern.trim(), frequency);
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}
