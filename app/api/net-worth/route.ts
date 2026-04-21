import { NextRequest, NextResponse } from "next/server";
import { getDb, sqlPlaceholders } from "@/lib/db";

export const dynamic = "force-dynamic";

function toIso(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function parseUtcDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

function snapToMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function getDateRange(range: string, now: Date): { from: string; to: string } {
  const today = toIso(now);
  const y = now.getFullYear();
  const m = now.getMonth();
  const endOfLastMonth = toIso(new Date(y, m, 0));
  switch (range) {
    case "mtd":      return { from: toIso(new Date(y, m, 1)),      to: today          };
    case "1month":   return { from: toIso(new Date(y, m - 1, 1)),  to: endOfLastMonth };
    case "2month":   return { from: toIso(new Date(y, m - 2, 1)),  to: endOfLastMonth };
    case "3month":   return { from: toIso(new Date(y, m - 3, 1)),  to: endOfLastMonth };
    case "6month":   return { from: toIso(new Date(y, m - 6, 1)),  to: endOfLastMonth };
    case "ytd":      return { from: toIso(new Date(y, 0, 1)),      to: today          };
    case "lastyear": return { from: toIso(new Date(y - 1, 0, 1)),  to: toIso(new Date(y - 1, 11, 31)) };
    case "12m":      return { from: toIso(new Date(y - 1, m, now.getDate())), to: today };
    default:         return { from: "",    to: today };
  }
}

export function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const dateRange     = searchParams.get("dateRange") ?? "12m";
    const accountIdsRaw = searchParams.get("accountIds") ?? "";
    const accountIds    = accountIdsRaw
      ? accountIdsRaw.split(",").map(Number).filter(Boolean)
      : [];

    const now = new Date();
    const { from, to } = getDateRange(dateRange, now);

    const acctAcctC = accountIds.length > 0
      ? `WHERE a.id IN (${sqlPlaceholders(accountIds.length)})`
      : "";
    const acctTransC = accountIds.length > 0
      ? `AND t.account_id IN (${sqlPlaceholders(accountIds.length)})`
      : "";
    const acctP = accountIds;

    // Current total balance (cash + holdings market value)
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

    // nwFrom: UTC-safe snap to first of month (or Jan 1 for all-time)
    let nwFrom: Date;
    if (!from) {
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

    const nwToDate = parseUtcDate(to);
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

    const fullValues = new Array(fullDays).fill(0);
    let nwRunning = balance;
    for (let i = fullDays - 1; i >= 0; i--) {
      fullValues[i] = nwRunning;
      if (i > 0) nwRunning -= dailyDeltaMap.get(fullDates[i]) ?? 0;
    }

    const clipDays = Math.max(2, Math.round((nwToDate.getTime() - nwFrom.getTime()) / 86_400_000) + 1);
    const nwDates  = fullDates.slice(0, clipDays);
    const nwValues = fullValues.slice(0, clipDays);
    const nwDays   = nwDates.length;

    const nwMonthIndices: number[] = [];
    const nwMonthLabels:  string[] = [];
    nwDates.forEach((d, i) => {
      if (d.slice(-2) === "01") {
        nwMonthIndices.push(i);
        nwMonthLabels.push(
          parseUtcDate(d).toLocaleString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" })
        );
      }
    });

    // Redistribute evenly; anchor single-month to left edge
    const nwN = nwMonthIndices.length;
    if (nwN === 1) {
      nwMonthIndices[0] = 0;
    } else if (nwN > 1) {
      for (let i = 0; i < nwN; i++) {
        nwMonthIndices[i] = Math.round(i * (nwDays - 1) / (nwN - 1));
      }
    }

    const totalMonths = nwMonthIndices.length;
    const nwTickIndices: number[] = [];
    const nwTickLabels:  string[] = [];

    if (nwDays > 365 * 2) {
      const yearBoundaries: { idx: number; label: string }[] = [];
      nwDates.forEach((d, i) => {
        if (d.slice(5) === "01-01") yearBoundaries.push({ idx: i, label: d.slice(0, 4) });
      });
      const yStep = yearBoundaries.length > 12 ? Math.ceil(yearBoundaries.length / 5) : yearBoundaries.length > 6 ? 2 : 1;
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
      const fmt = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric" });
      nwTickIndices.push(0, nwDays - 1);
      nwTickLabels.push(fmt(nwFrom), fmt(now));
    } else {
      nwTickIndices.push(0);
      nwTickLabels.push(nwMonthLabels[0]);
      if (totalMonths > 1) {
        nwTickIndices.push(nwDays - 1);
        nwTickLabels.push(nwMonthLabels[totalMonths - 1]);
      }
    }

    return NextResponse.json({
      balance,
      values:       nwValues,
      monthIndices: nwMonthIndices,
      monthLabels:  nwMonthLabels,
      tickIndices:  nwTickIndices,
      tickLabels:   nwTickLabels,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed." },
      { status: 500 }
    );
  }
}
