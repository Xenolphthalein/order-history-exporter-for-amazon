/**
 * Transaction URL building, CSV formatting, and CPE page parsing utilities
 */

import type { Transaction } from '../types';
import { parseOrderDate } from './dateUtils';
import { extractPriceFromText } from './priceUtils';

/**
 * Build the URL for an order's transaction detail page
 */
export function buildTransactionUrl(origin: string, orderId: string): string {
  return `${origin}/cpe/yourpayments/transactions?transactionTag=${encodeURIComponent(orderId)}`;
}

/**
 * Format transaction dates as a pipe-separated string for CSV
 */
export function formatTransactionDatesForCSV(transactions: Transaction[]): string {
  if (transactions.length === 0) return '';
  return transactions.map((t) => t.date).join(' | ');
}

/**
 * Format transaction amounts as a pipe-separated string for CSV
 */
export function formatTransactionAmountsForCSV(transactions: Transaction[]): string {
  if (transactions.length === 0) return '';
  return transactions.map((t) => String(t.amount)).join(' | ');
}

/**
 * Parse transactions from the /cpe/yourpayments/transactions page.
 * Amazon's CPE page is server-rendered and contains the actual charged amounts.
 *
 * Sign convention: Amazon shows charges as "-$X.XX" (debit from card) and
 * refunds as "$X.XX" (credit to card). We negate so the export reflects the
 * user's perspective — charges are positive, refunds are negative.
 */
export function parseTransactionsFromCPEPage(html: string): Transaction[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const transactions: Transaction[] = [];
  const seen = new Set<string>();

  // Each transaction group is an .a-box-group containing .apx-transaction-date-container
  const groups = doc.querySelectorAll('.a-box-group');
  for (const group of groups) {
    const dateEl = group.querySelector('.apx-transaction-date-container span');
    if (!dateEl) continue;

    const dateText = dateEl.textContent?.trim() ?? '';
    const date = parseOrderDate(dateText);
    if (!date) continue;

    const amountEls = group.querySelectorAll(
      '.a-column.a-span3.a-text-right.a-span-last .a-size-base-plus.a-text-bold,' +
        '.apx-transactions-line-item-component-container .a-size-base-plus.a-text-bold'
    );

    for (const amountEl of amountEls) {
      const amountText = amountEl.textContent?.trim() ?? '';
      if (!amountText) continue;

      const isDebit = /^[-−]/.test(amountText);
      const price = extractPriceFromText(amountText);
      if (!price || price.amount === 0) continue;

      const amount = isDebit ? price.amount : -price.amount;
      const key = `${date}:${amount}`;
      if (!seen.has(key)) {
        seen.add(key);
        transactions.push({ date, amount, currency: price.currency });
      }
    }
  }

  return transactions;
}
