# Ledgr

A local-first personal finance tracker built with Next.js and SQLite. Import bank exports, categorize spending, track investments, and see where your money goes — all on your own machine, no cloud, no accounts.

![Stack](https://img.shields.io/badge/Next.js%2016-React%2019-blue) ![DB](https://img.shields.io/badge/SQLite-better--sqlite3-green)

## Features

### Import & Transactions
- **Bank import**: Auto-detects and parses exports from PostFinance (account + credit card), Handelsbanken (XLSX), Avanza, and Moneydance CSV
- **Duplicate detection** on import, with per-batch undo (delete an entire import in one click)
- **Virtualized transaction list**: smooth scrolling through thousands of rows via `@tanstack/react-virtual`
- **Inline editing, bulk operations**: recategorize, tag, or delete many transactions at once
- **Transfers**: link two transactions across accounts as a pair, with auto-created mirror transactions
- **Tags**: system tags (Transfer, Owed by parents, Needs review) plus custom tags

### Accounts & Currencies
- Multiple accounts (checking, savings, credit card, investment) with brand colors
- Multi-currency (CHF base; EUR, USD, SEK, GBP) with weekly auto-refreshed exchange rates via currencyapi.com

### Categories
- Hierarchical category tree (e.g. `Needs: General: Groceries`) with inherited colors and icons
- Fixed system roots (Income / Expenses / Savings, Needs / Wants) with user-defined leaves
- Review workflow for uncategorized or suspicious transactions

### Insights
- **Dashboard**: net worth chart, income vs. expenses, spending by category, recent activity
- **Cash flow**: Sankey diagram of money movement (`@nivo/sankey`)
- **Reports**: donut charts with drill-down, category-root tab filtering
- **Investments**: holdings per account with live prices via `yahoo-finance2`
- Budget, Goals, and Recurring pages exist as UI; backend hookup is in progress (see `TODO.md`)

## Getting Started

Requires Node.js 18+ (managed via [mise](https://mise.jdx.dev/) recommended).

```bash
npm install
npm run dev        # http://localhost:3000
```

If better-sqlite3 fails with a `NODE_MODULE_VERSION` mismatch after a Node upgrade:

```bash
npm rebuild better-sqlite3
```

### Configuration

Optional `.env.local`:

```
CURRENCYAPI_KEY=...   # currencyapi.com key for automatic exchange rates
```

Without it, exchange rates can still be set manually per account.

### Database

SQLite database lives at `data/finance.db` (WAL mode) and is created and migrated automatically on first run. No setup step needed. Tables: `accounts`, `transactions`, `categories`, `tags`, `holdings`, `imports`, `exchange_rate_cache`.

## Project Structure

```
app/
├── page.tsx            # Dashboard
├── transactions/       # Main transaction list (virtualized, filters, bulk ops)
├── accounts/           # Account cards + management
├── categories/         # Category tree editor
├── cashflow/           # Sankey cash flow
├── reports/            # Donut drill-down reports
├── investments/        # Holdings & prices
├── budget/ goals/ recurring/   # UI built, backend WIP
├── api/                # REST endpoints (accounts, transactions, categories,
│                       #  tags, holdings, imports, dashboard, cashflow, ...)
└── components/         # ~30 shared components (modals, charts, tables)

lib/
├── db.ts               # SQLite singleton, runs schema + migrations on boot
├── schema.ts           # CREATE TABLEs, seeds, append-only migration list
├── categories.ts       # Category tree/path utilities
├── exchange-rates.ts   # Weekly rate refresh from currencyapi.com
└── parsers/            # One file per bank format + auto-detection

csv-converter/          # Standalone Python helper: bank export → categorized XLSX
DESIGN.md               # Ledgr v2 design system (tokens, type scale, components)
```

## Design

The UI follows the **Ledgr v2 design system** documented in [`DESIGN.md`](DESIGN.md): oklch color tokens, Fraunces for display type, Inter for UI, JetBrains Mono for numbers, and `.v2-card` surface patterns. Dark mode via `html[data-theme="dark"]`.

## License

Private project.
