/**
 * Order validation and filtering utilities
 */

import type { Order } from '../types';

/**
 * Check if an order is actually an advertisement/recommendation block
 */
export function isAdvertisementOrder(order: Order): boolean {
  // No order date is a strong indicator of a fake order
  if (!order.orderDate) {
    // Check if items contain known advertisement patterns
    const adPatterns = [
      /amazon\s*visa/i,
      /barclays\s*finanzierung/i,
      /amazon\s*business.*card/i,
      /kreditkarte/i,
      /finanzierung/i,
      /prime.*card/i,
      /amazon.*amex/i,
    ];

    const hasAdItem = order.items.some((item) =>
      adPatterns.some((pattern) => pattern.test(item.title))
    );

    if (hasAdItem) {
      return true;
    }

    // If no date, no status, no details URL, and all items have price 0 - likely an ad
    if (!order.orderStatus && !order.detailsUrl) {
      const allPricesZero = order.items.every((item) => item.price === 0);
      if (allPricesZero && order.items.length > 5) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extract order ID from text
 */
export function extractOrderId(text: string): string | null {
  const orderIdMatch = text.match(/\d{3}-\d{7}-\d{7}/);
  return orderIdMatch?.[0] || null;
}

/**
 * Extract order ID from URL
 */
export function extractOrderIdFromUrl(url: string): string | null {
  const urlMatch = url.match(/orderI[Dd]=(\d{3}-\d{7}-\d{7})/i);
  return urlMatch?.[1] || null;
}
