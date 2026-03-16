import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { CREATE_TABLES, MIGRATIONS, SEED_CATEGORIES } from "./schema";
import { refreshExchangeRates } from "./exchange-rates";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH  = path.join(DATA_DIR, "finance.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(CREATE_TABLES);

    db.exec(SEED_CATEGORIES);

    // Run migrations one by one, ignoring "duplicate column" errors
    for (const stmt of MIGRATIONS.split(";").map((s) => s.trim()).filter(Boolean)) {
      try {
        db.exec(stmt);
      } catch {
        // Column already exists — safe to ignore
      }
    }

    // Refresh exchange rates in the background on first startup
    refreshExchangeRates(db).catch((e) =>
      console.error("[exchange-rates] Background refresh failed:", e)
    );
  }
  return db;
}
