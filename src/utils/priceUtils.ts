/**
 * Price parsing utilities
 */

/**
 * Parse a price string to a number, handling European and US formats
 * European: "1.234,56" or "1234,56"
 * US: "1,234.56" or "1234.56"
 */
export function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;

  let cleaned = priceStr.trim();

  // Handle European format (1.234,56 -> 1234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // If comma comes after period, it's European format
    const lastComma = cleaned.lastIndexOf(',');
    const lastPeriod = cleaned.lastIndexOf('.');

    if (lastComma > lastPeriod) {
      // European: periods are thousands separators, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US: commas are thousands separators, period is decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (cleaned.includes(',')) {
    // Check if comma is decimal separator (e.g., "12,99")
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1] && parts[1].length <= 2) {
      // Likely a decimal comma
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely a thousands separator
      cleaned = cleaned.replace(/,/g, '');
    }
  }

  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * Detect currency from text content
 */
export function detectCurrency(text: string): string {
  if (text.includes('€') || text.includes('EUR')) {
    return 'EUR';
  } else if (text.includes('£') || text.includes('GBP')) {
    return 'GBP';
  } else if (text.includes('$') || text.includes('USD')) {
    return 'USD';
  }
  return 'EUR'; // Default
}

/**
 * Extract price from text using common patterns
 */
export function extractPriceFromText(text: string): { amount: number; currency: string } | null {
  const pricePatterns = [
    /(?:Summe|Gesamtsumme|Gesamt|Total)[:\s]*(?:EUR|€)?\s*([0-9.,]+)\s*(?:EUR|€)?/i,
    /(?:EUR|€)\s*([0-9.,]+)/i,
    /([0-9]+[.,][0-9]{2})\s*(?:EUR|€)/,
    /\$\s*([0-9.,]+)/,
    /£\s*([0-9.,]+)/,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const amount = parsePrice(match[1]);
      if (amount > 0) {
        return {
          amount,
          currency: detectCurrency(text),
        };
      }
    }
  }

  return null;
}

/**
 * Like extractPriceFromText but returns negative amounts for refunds/credits.
 * Negates the amount when:
 * - The text has an explicit minus sign before the currency symbol or amount, OR
 * - The text contains a refund/credit keyword in any supported locale.
 */
export function extractSignedPriceFromText(
  text: string
): { amount: number; currency: string } | null {
  // Explicit negative sign adjacent to a currency symbol or number
  const hasMinusSign =
    /(?:^|[\s(])[-−]\s*(?:EUR|€|\$|£|USD|GBP)\s*[0-9]/.test(text) ||
    /(?:EUR|€|\$|£|USD|GBP)\s*[-−]\s*[0-9]/.test(text);

  // Refund/credit keywords (EN, DE, FR, IT, ES).
  // French keywords ending in é/ée cannot use \b (é is non-ASCII → no word boundary),
  // so they are matched separately with a simple substring check.
  const isRefundContext =
    /\b(?:refund(?:ed)?|return(?:ed)?|r[uü]ckerstattung|erstattung|gutschrift|remboursement|rimborso|reembolso(?:ado)?)\b/i.test(
      text
    ) || /rembours/i.test(text);

  const price = extractPriceFromText(text);
  if (!price) return null;

  return {
    amount: hasMinusSign || isRefundContext ? -price.amount : price.amount,
    currency: price.currency,
  };
}
