# Finance Tracker

A high-performance personal finance tracking application built with Next.js and SQLite. Import transactions, organize by category, and gain visibility into your spending across multiple bank accounts.

## Features

### Transaction Management
- **Bulk Import**: Import transactions from CSV exports (supports Moneydance, bank CSV formats)
- **Duplicate Detection**: Automatically warns about duplicate transactions during import
- **Inline Editing**: Click any field to edit—changes apply instantly with optimistic updates
- **Search & Filter**: Debounced search, filter by date range, account, category, amount, and more
- **Bulk Operations**: Categorize, mark as reimbursable, delete multiple transactions at once

### Account Management
- **Multi-Account Support**: Track finances across multiple accounts (checking, savings, credit cards, investments)
- **Currency Support**: Track accounts in different currencies (CHF, EUR, USD, SEK, GBP) with automatic exchange rate conversion
- **Brand Colors**: Account color indicators using primary brand colors of major banks (PostFinance, ZKB, Wise, etc.)

### Categorization
- **Hierarchical Categories**: Organize expenses into parent-child categories (e.g., Expenses > Wants > Entertainment)
- **Review Workflow**: Flag uncategorized/invalid transactions for review
- **Bulk Recategorization**: Apply category changes to multiple transactions with one click
- **Recat Dialog**: Bulk reclassify transactions sharing the same original category

### Transaction Features
- **Transfers**: Link two transactions to represent transfers between accounts
- **Reimbursable Tracking**: Mark transactions as "owed by parents" for easy reimbursement tracking
- **Import History**: Undo entire imports—deletes all transactions from a specific import batch
- **Exchange Rate Handling**: Automatic currency conversion to CHF base currency with per-account exchange rates

### Performance
- **Virtualized Lists**: Only renders visible rows when displaying 4,500+ transactions
- **Debounced Search**: 300ms debounced input prevents per-keystroke re-renders
- **Optimistic Updates**: UI updates instantly without waiting for server confirmation
- **Memoized Components**: Minimizes re-renders during bulk operations

## Tech Stack

- **Frontend**: React 19, Next.js 16, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite (better-sqlite3) with indexed queries
- **Performance**: @tanstack/react-virtual for list virtualization
- **Import**: XLSX parser for Excel/CSV support

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Setup

SQLite database is automatically initialized on first run. Schema includes:
- `accounts` - Bank accounts with exchange rates and balance info
- `transactions` - Individual transactions linked to accounts
- `categories` - Hierarchical transaction categories
- `imports` - Import batch tracking for undo functionality
- `exchange_rate_cache` - Cached currency exchange rates

## Project Structure

```
app/
├── transactions/       # Main transactions page with list virtualization
├── accounts/          # Account management page
├── budget/            # Budget planning (stub)
├── api/
│   ├── transactions/  # Transaction endpoints, bulk operations, imports
│   ├── accounts/      # Account CRUD
│   ├── categories/    # Category hierarchy, lightweight endpoint for popover
│   └── imports/       # Import history and undo
└── components/
    ├── TransactionRow        # Memoized row component
    ├── SetCategoryPopover    # Category selection (page-level isolated)
    ├── CsvImportModal        # CSV import workflow with duplicate detection
    └── AccountModal          # Account creation/editing

lib/
├── db.ts              # SQLite connection
├── schema.ts          # Database schema and migrations
├── categories.ts      # Category hierarchy utilities
├── parsers/           # CSV format parsers (Moneydance, generic)
└── utils.ts           # Formatting helpers

```

## Performance Optimizations

1. **List Virtualization**: Uses `@tanstack/react-virtual` to render only ~40 visible rows from 4,500+ transactions
2. **Memoized Components**: `React.memo()` on transaction rows prevents cascading re-renders
3. **Optimistic Updates**: State updates instantly, network requests fire without blocking UI
4. **Debounced Search**: 300ms debounce on search input to prevent per-keystroke filtering
5. **Lightweight Endpoints**: Dedicated `/api/transactions/categories` for popover data instead of full row fetch
6. **Indexed Queries**: Database indexes on commonly filtered columns (account_id, date, category)
7. **Isolated Popover**: Category popover component manages its own state to avoid parent re-renders on open

## Import Formats Supported

- **Moneydance CSV**: Detected by DD/MM/YYYY date format, custom separator handling
- **Generic CSV**: Standard MM/DD/YYYY or YYYY-MM-DD formats
- **XLSX/XLS**: Via xlsx parser

All imports are tracked with filename and count for easy batch undo.

## Currency Support

Accounts support:
- CHF (Swiss Franc) - base currency
- EUR, USD, SEK, GBP

Exchange rates can be manually set per account and are cached for 24 hours.

## Future Enhancements

- Budget tracking and comparison
- Monthly/yearly reports and charts
- Recurring transaction patterns
- Export to PDF/Excel
- Mobile app (React Native)

## License

Private project.
