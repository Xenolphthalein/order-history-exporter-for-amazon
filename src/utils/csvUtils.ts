/**
 * CSV conversion utilities
 */

import type { Order } from '../types';
import { formatTransactionDatesForCSV, formatTransactionAmountsForCSV } from './transactionUtils';

/**
 * Escape a value for CSV format
 */
export function escapeCSVValue(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format promotions as a string for CSV
 */
export function formatPromotionsForCSV(
  promotions: { description: string; amount: number }[]
): string {
  return promotions.map((p) => `${p.description}: €${p.amount}`).join('; ');
}

/**
 * Convert orders to CSV format
 * @param orders - Array of orders to convert
 * @param getHeader - Function to get localized header name
 * @param includeTransactions - Whether to add Transaction Dates and Transaction Amounts columns
 */
export function convertOrdersToCSV(
  orders: Order[],
  getHeader: (key: string) => string = (key) => key,
  includeTransactions: boolean = false
): string {
  const headers = [
    getHeader('csvHeaderOrderId'),
    getHeader('csvHeaderOrderDate'),
    getHeader('csvHeaderTotalAmount'),
    getHeader('csvHeaderCurrency'),
    getHeader('csvHeaderTotalSavings'),
    getHeader('csvHeaderStatus'),
    getHeader('csvHeaderItemTitle'),
    getHeader('csvHeaderItemAsin'),
    getHeader('csvHeaderItemQuantity'),
    getHeader('csvHeaderItemPrice'),
    getHeader('csvHeaderItemDiscount'),
    getHeader('csvHeaderPromotions'),
    getHeader('csvHeaderItemUrl'),
    getHeader('csvHeaderDetailsUrl'),
  ];

  if (includeTransactions) {
    headers.push(getHeader('csvHeaderTransactionDates'));
    headers.push(getHeader('csvHeaderTransactionAmounts'));
  }

  const rows: string[] = [headers.join(',')];

  orders.forEach((order) => {
    const promotionsStr = formatPromotionsForCSV(order.promotions);
    const transactions = order.transactions ?? [];
    const txDates = includeTransactions
      ? escapeCSVValue(formatTransactionDatesForCSV(transactions))
      : null;
    const txAmounts = includeTransactions
      ? escapeCSVValue(formatTransactionAmountsForCSV(transactions))
      : null;

    const txColumns = (firstRow: boolean): (string | number)[] => {
      if (!includeTransactions) return [];
      return firstRow ? [txDates ?? '', txAmounts ?? ''] : ['', ''];
    };

    if (order.items.length === 0) {
      rows.push(
        [
          escapeCSVValue(order.orderId),
          escapeCSVValue(order.orderDate),
          order.totalAmount,
          escapeCSVValue(order.currency),
          order.totalSavings,
          escapeCSVValue(order.orderStatus),
          '',
          '',
          '',
          '',
          '',
          escapeCSVValue(promotionsStr),
          '',
          escapeCSVValue(order.detailsUrl),
          ...txColumns(true),
        ].join(',')
      );
    } else {
      order.items.forEach((item, index) => {
        rows.push(
          [
            escapeCSVValue(order.orderId),
            escapeCSVValue(order.orderDate),
            order.totalAmount,
            escapeCSVValue(order.currency),
            index === 0 ? order.totalSavings : '',
            escapeCSVValue(order.orderStatus),
            escapeCSVValue(item.title),
            escapeCSVValue(item.asin),
            item.quantity,
            item.price,
            item.discount,
            index === 0 ? escapeCSVValue(promotionsStr) : '',
            escapeCSVValue(item.itemUrl),
            escapeCSVValue(order.detailsUrl),
            ...txColumns(index === 0),
          ].join(',')
        );
      });
    }
  });

  return rows.join('\n');
}
