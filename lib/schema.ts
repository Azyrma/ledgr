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
  CREATE TABLE IF NOT EXISTS holdings (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id         INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    ticker             TEXT    NOT NULL,
    name               TEXT    NOT NULL,
    shares             REAL    NOT NULL,
    avg_cost_per_share REAL    NOT NULL,
    currency           TEXT    NOT NULL DEFAULT 'USD',
    created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON holdings(account_id);
  ALTER TABLE transactions ADD COLUMN ticker TEXT NOT NULL DEFAULT '';
  ALTER TABLE transactions ADD COLUMN shares REAL NOT NULL DEFAULT 0;
  ALTER TABLE holdings ADD COLUMN isin TEXT NOT NULL DEFAULT '';
  ALTER TABLE holdings ADD COLUMN current_price REAL;
  ALTER TABLE holdings ADD COLUMN price_updated_at TEXT;
  ALTER TABLE categories ADD COLUMN icon TEXT;
  INSERT INTO categories (name, parent_id, is_system) SELECT 'Income', 1, 0 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = 1 AND name = 'Income' AND is_system = 0);
  UPDATE categories SET parent_id = (SELECT id FROM categories WHERE parent_id = 1 AND name = 'Income' AND is_system = 0 LIMIT 1) WHERE id IN (6, 7, 27) AND parent_id = 1;
  UPDATE transactions SET category = 'Income: Salary' WHERE category = 'Salary';
  UPDATE transactions SET category = 'Income: Parents' WHERE category = 'Parents';
  UPDATE transactions SET category = 'Income: Miscellaneous' WHERE category = 'Miscellaneous';
  INSERT INTO categories (name, parent_id, is_system) SELECT 'General', 3, 0 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = 3 AND name = 'General' AND is_system = 0);
  UPDATE categories SET parent_id = (SELECT id FROM categories WHERE parent_id = 3 AND name = 'General' AND is_system = 0 LIMIT 1) WHERE id IN (14, 21, 41, 46) AND parent_id = 3;
  UPDATE transactions SET category = 'Needs: General: Groceries' WHERE category = 'Needs: Groceries';
  UPDATE transactions SET category = 'Needs: General: Phone' WHERE category = 'Needs: Phone';
  UPDATE transactions SET category = 'Needs: General: Miscellaneous' WHERE category = 'Needs: Miscellaneous';
  UPDATE transactions SET category = 'Needs: General: Personal Care' WHERE category = 'Needs: Personal Care';
  INSERT INTO categories (name, parent_id, is_system) SELECT 'General', 4, 0 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = 4 AND name = 'General' AND is_system = 0);
  UPDATE categories SET parent_id = (SELECT id FROM categories WHERE parent_id = 4 AND name = 'General' AND is_system = 0 LIMIT 1) WHERE id IN (33, 38, 40) AND parent_id = 4;
  UPDATE transactions SET category = 'Wants: General: Travel' WHERE category = 'Wants: Travel';
  UPDATE transactions SET category = 'Wants: General: Clothing' WHERE category = 'Wants: Clothing';
  UPDATE transactions SET category = 'Wants: General: Gifts' WHERE category = 'Wants: Gifts';
  INSERT INTO categories (name, parent_id, is_system) SELECT 'Savings', 5, 0 WHERE EXISTS (SELECT 1 FROM categories WHERE id = 10 AND parent_id = 5);
  UPDATE categories SET parent_id = (SELECT id FROM categories WHERE parent_id = 5 AND name = 'Savings' AND is_system = 0 ORDER BY id DESC LIMIT 1) WHERE id IN (10, 11) AND parent_id = 5;
  UPDATE transactions SET category = 'Savings: Investment' WHERE category = 'Investment';
  UPDATE transactions SET category = 'Savings: Savings' WHERE category = 'Savings';
  INSERT INTO categories (name, parent_id, is_system) SELECT 'General', 24, 0 WHERE NOT EXISTS (SELECT 1 FROM categories WHERE parent_id = 24 AND name = 'General');
  UPDATE transactions SET category = 'Needs: Sports: General' WHERE category = 'Needs: Sports';
  CREATE TABLE IF NOT EXISTS tags (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT    NOT NULL,
    color     TEXT,
    icon      TEXT,
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT   NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO tags (id, name, color, icon, is_system) VALUES (1, 'Transfer',        '#6B8CAE', NULL, 1);
  INSERT OR IGNORE INTO tags (id, name, color, icon, is_system) VALUES (2, 'Owed by parents', '#C49A3C', NULL, 1);
  INSERT OR IGNORE INTO tags (id, name, color, icon, is_system) VALUES (3, 'Needs review',    '#E07B4F', NULL, 1);
`;
