import * as XLSX from "xlsx";
import type { ParsedTransaction } from "./types";

// Handelsbanken's xlsx exports use ZIP data descriptors (general-purpose flag bit 3)
// with stored (uncompressed) entries. SheetJS 0.18.5 mis-parses this layout and
// throws "Bad compressed size". We rewrite each local file header with the sizes
// from the central directory and clear bit 3, so the parser sees a normal zip.
function normalizeZipDataDescriptors(input: Buffer): Buffer {
  const buf = Buffer.from(input);
  // Find End-of-Central-Directory record (signature 0x06054b50), scanning from end.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 0xffff - 22; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) return buf;

  const cdStart = buf.readUInt32LE(eocd + 16);
  let p = cdStart;
  while (p + 46 <= eocd && buf.readUInt32LE(p) === 0x02014b50) {
    const flags = buf.readUInt16LE(p + 8);
    const crc32 = buf.readUInt32LE(p + 16);
    const csz = buf.readUInt32LE(p + 20);
    const usz = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);

    if ((flags & 0x8) !== 0 && buf.readUInt32LE(localOffset) === 0x04034b50) {
      buf.writeUInt16LE(flags & ~0x8, localOffset + 6);
      buf.writeUInt32LE(crc32, localOffset + 14);
      buf.writeUInt32LE(csz, localOffset + 18);
      buf.writeUInt32LE(usz, localOffset + 22);
    }

    p += 46 + nameLen + extraLen + commentLen;
  }
  return buf;
}

export function parseHandelsbanken(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(normalizeZipDataDescriptors(buffer), { type: "buffer", cellDates: true });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

  const headerIdx = allRows.findIndex((row) => {
    const cell = row && String(row[0] ?? "").trim().toLowerCase();
    return cell === "ledger date" || cell === "reskontradatum";
  });
  if (headerIdx === -1) throw new Error("Could not find header row in Handelsbanken file.");

  const transactions: ParsedTransaction[] = [];

  for (const row of allRows.slice(headerIdx + 1) as string[][]) {
    if (!row || row[0] == null) continue;

    const transactionDateStr = String(row[1] ?? "").trim();
    const description = String(row[2] ?? "").trim();
    const amountRaw = row[3];

    if (!transactionDateStr || !description) continue;

    // Date may be YYYY-MM-DD string or a formatted date string
    let isoDate: string;
    const match = transactionDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      isoDate = `${match[1]}-${match[2]}-${match[3]}`;
    } else {
      continue;
    }

    const amount = parseFloat(String(amountRaw).replace(",", "."));
    if (isNaN(amount)) continue;

    transactions.push({
      date: isoDate,
      description,
      amount,
      category: "",
    });
  }

  return transactions;
}
