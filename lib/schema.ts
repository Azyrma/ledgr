export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL DEFAULT 'checking',
    currency        TEXT    NOT NULL DEFAULT 'CHF',
    color           TEXT    NOT NULL DEFAULT '#6366f1',
    exchange_rate   REAL    NOT NULL DEFAULT 1.0,
    initial_balance REAL    NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    color     TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    date         TEXT    NOT NULL,
    description  TEXT    NOT NULL,
    amount       REAL    NOT NULL,
    category     TEXT    NOT NULL DEFAULT '',
    reimbursable INTEGER NOT NULL DEFAULT 0,
    needs_review INTEGER NOT NULL DEFAULT 0,
    linked_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS imports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT    NOT NULL,
    account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    count       INTEGER NOT NULL,
    imported_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exchange_rate_cache (
    currency    TEXT PRIMARY KEY,
    rate_to_chf REAL NOT NULL,
    fetched_at  TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_category   ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_transactions_linked     ON transactions(linked_transaction_id);
  CREATE INDEX IF NOT EXISTS idx_categories_parent_id   ON categories(parent_id);
`;

// Seed the fixed system categories — safe to run repeatedly
export const SEED_CATEGORIES = `
  INSERT OR IGNORE INTO categories (id, name, parent_id, color, is_system) VALUES
    (1, 'Income',   NULL, '#10b981', 1),
    (2, 'Expenses', NULL, '#ef4444', 1),
    (3, 'Needs',    2,    NULL,      1),
    (4, 'Wants',    2,    NULL,      1),
    (5, 'Savings',  NULL, '#3b82f6', 1);
`;

// Adds columns introduced after initial release — safe to run repeatedly
export const MIGRATIONS = `
  ALTER TABLE accounts ADD COLUMN currency        TEXT NOT NULL DEFAULT 'CHF';
  ALTER TABLE accounts ADD COLUMN color           TEXT NOT NULL DEFAULT '#6366f1';
  ALTER TABLE accounts ADD COLUMN initial_balance REAL NOT NULL DEFAULT 0;
  ALTER TABLE transactions ADD COLUMN reimbursable INTEGER NOT NULL DEFAULT 0;
  UPDATE categories SET parent_id = NULL, color = '#3b82f6' WHERE id = 5;
  ALTER TABLE transactions ADD COLUMN category     TEXT    NOT NULL DEFAULT '';
  ALTER TABLE transactions ADD COLUMN linked_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
  ALTER TABLE transactions ADD COLUMN needs_review INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE accounts ADD COLUMN exchange_rate REAL NOT NULL DEFAULT 1.0;
  CREATE TABLE IF NOT EXISTS imports (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    filename    TEXT    NOT NULL,
    account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    count       INTEGER NOT NULL,
    imported_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  ALTER TABLE transactions ADD COLUMN import_id INTEGER REFERENCES imports(id) ON DELETE SET NULL;
`;
