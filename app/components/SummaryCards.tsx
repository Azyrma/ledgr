import { formatCurrency } from "@/lib/utils";

type Card = {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
};

type Props = {
  balance: number;
  income: number;
  expenses: number;
  savings: number;
};

export default function SummaryCards({ balance, income, expenses, savings }: Props) {
  const cards: Card[] = [
    {
      label: "Balance",
      value: balance,
      color: "text-base-content",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: "Income",
      value: income,
      color: "text-success",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ),
    },
    {
      label: "Expenses",
      value: expenses,
      color: "text-error",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      ),
    },
    {
      label: "Savings",
      value: savings,
      color: "text-info",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
          <path d="M3 21h18" />
          <path d="M9 10h6" />
          <path d="M12 7v6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="card bg-base-100 border border-base-300">
          <div className="card-body p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-base-content/60">{card.label}</span>
              <span className={card.color}>{card.icon}</span>
            </div>
            <p className={`mt-3 text-2xl font-semibold ${card.color}`}>
              {formatCurrency(card.value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
