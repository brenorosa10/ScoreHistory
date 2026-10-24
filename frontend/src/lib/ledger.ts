export const EXPENSE_CATEGORIES = [
  "Aula",
  "Clube",
  "Corda",
  "Overgrip",
  "Grip",
  "Bolinhas",
  "Raquete",
  "Torneio",
  "Outro",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  Aula: "Aula",
  Clube: "Clube/Quadra",
  Corda: "Corda",
  Overgrip: "Overgrip",
  Grip: "Grip",
  Bolinhas: "Bolinhas",
  Raquete: "Raquete",
  Torneio: "Torneio",
  Outro: "Outro",
};

export type LedgerExpense = {
  occurredAt: string;
  category: string;
  amount: number;
};

export function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return monthKey(date);
}

export function monthStart(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
}

export function expenseMonth(occurredAt: string): string {
  const date = new Date(occurredAt);
  return monthKey(date);
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export type CategoryTotals = Record<ExpenseCategory, number> & { total: number };

export function emptyTotals(): CategoryTotals {
  return {
    Aula: 0,
    Clube: 0,
    Corda: 0,
    Overgrip: 0,
    Grip: 0,
    Bolinhas: 0,
    Raquete: 0,
    Torneio: 0,
    Outro: 0,
    total: 0,
  };
}

export function categoryTotals(expenses: LedgerExpense[], month: string): CategoryTotals {
  const totals = emptyTotals();
  for (const expense of expenses) {
    if (expenseMonth(expense.occurredAt) !== month) {
      continue;
    }
    const amount = expense.amount || 0;
    totals.total += amount;
    if (isExpenseCategory(expense.category)) {
      totals[expense.category] += amount;
    }
  }
  totals.total = Math.round(totals.total * 100) / 100;
  for (const category of EXPENSE_CATEGORIES) {
    totals[category] = Math.round(totals[category] * 100) / 100;
  }
  return totals;
}

export function recentMonthTotals(expenses: LedgerExpense[], month: string, count = 6) {
  const months: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    months.push(shiftMonth(month, -index));
  }
  return months.map((key) => ({ month: key, total: categoryTotals(expenses, key).total }));
}

export function hasFee(expenses: LedgerExpense[], month: string, category: "Aula" | "Clube"): boolean {
  return expenses.some(
    (expense) => expense.category === category && expenseMonth(expense.occurredAt) === month,
  );
}

function dayNumber(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return Number.NaN;
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Average whole days between consecutive dates. Needs at least two dates. */
export function averageIntervalDays(dates: Array<string | null | undefined>): number | null {
  const days = dates
    .filter((value): value is string => Boolean(value))
    .map(dayNumber)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  if (days.length < 2) {
    return null;
  }

  let sum = 0;
  for (let index = 1; index < days.length; index += 1) {
    sum += Math.round((days[index] - days[index - 1]) / 86_400_000);
  }
  return Math.round(sum / (days.length - 1));
}

export function intervalLabel(dates: Array<string | null | undefined>): string | null {
  const average = averageIntervalDays(dates);
  if (average == null) {
    return null;
  }
  return average === 1 ? "média a cada 1 dia" : `média a cada ${average} dias`;
}
