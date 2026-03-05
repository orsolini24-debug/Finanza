import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function filterCategoriesByType(categories: any[], transactionIsIncome: boolean) {
  return categories.filter(c => 
    transactionIsIncome ? c.type !== 'EXPENSE' : c.type !== 'INCOME'
  );
}

/**
 * Formats a number as Italian currency (Euro).
 */
export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '€ 0,00';
  }

  return numericAmount.toLocaleString('it-IT', { 
    style: 'currency', 
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
