# CLAUDE.md

Ledgr: local-first personal finance tracker. Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4/daisyUI + better-sqlite3. No tests exist.

## Commands

- `npm run dev` — dev server (localhost:3000)
- `npm run build` / `npm run lint`
- better-sqlite3 NODE_MODULE_VERSION error → `npm rebuild better-sqlite3`

## Architecture

- DB: SQLite at `data/finance.db` (WAL). Singleton via `getDb()` in `lib/db.ts` — creates tables, seeds, and runs migrations on first call. **Never** open the DB another way.
- Migrations: append-only, idempotent SQL strings in `MIGRATIONS` (`lib/schema.ts`) — rules in `.claude/rules/database.md`, task guide in the `add-migration` skill.
- API: Next.js route handlers under `app/api/*/route.ts`, synchronous better-sqlite3 queries, plain JSON. No ORM. No auth (local-first); `proxy.ts` blocks cross-origin requests to `/api` (CSRF guard) — don't remove it.
- Pages are `"use client"` components fetching from `/api/*`. Budget/Goals/Recurring pages are UI-only stubs (see TODO.md).
- Bank imports: `lib/parsers/` — one parser per bank, format auto-detected in `parsers/index.ts` by filename/content sniff. New parser = new file + case in `detectBankType`/`parseFile` + `BANK_LABELS` entry, returning `ParsedTransaction[]` (`types.ts`).

## Key conventions

- `transactions.category` is a TEXT path string like `"Needs: General: Groceries"`, NOT a foreign key. Paths are built by `getCategoryPath()` (`lib/categories.ts`), which skips system roots Income(1)/Expenses(2)/Savings(5) but keeps Needs(3)/Wants(4). Renaming a category requires UPDATEing transaction rows too.
- Category IDs 1–5 are fixed system roots (`is_system=1`); colors/icons inherit down the tree.
- Amounts are stored in the account's currency; convert to CHF (base) via `accounts.exchange_rate`. Rates auto-refresh weekly (`lib/exchange-rates.ts`, needs `CURRENCYAPI_KEY` in `.env.local`).
- Transfers: two transactions linked via `linked_transaction_id` (mirror rows auto-created).
- Imports tracked in `imports` table; `transactions.import_id` enables batch undo.
- UI styling: Ledgr v2 design system — `DESIGN.md` is authoritative; hard rules in `.claude/rules/frontend.md`.
