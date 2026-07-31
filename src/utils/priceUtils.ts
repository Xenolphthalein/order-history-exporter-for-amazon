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
 * Regex source for currency tokens across all supported marketplaces.
 * Shared so every price-scraping regex matches non-euro marketplaces
 * (amazon.co.uk, amazon.com) instead of silently returning 0.
 * Keep in sync with detectCurrency below.
 */
export const CURRENCY_TOKEN = '(?:EUR|GBP|USD|SEK|€|£|\\$|kr)';

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
  } else if (/(?:\d[\d.,]*\s*kr|kr\s*\d[\d.,]*|SEK)/i.test(text)) {
    return 'SEK';
  }
  return 'EUR'; // Default
}

/**
 * Extract price from text using common patterns
 */
export function extractPriceFromText(text: string): { amount: number; currency: string } | null {
  const pricePatterns = [
    /(?:Summe|Gesamtsumme|Gesamt|Total|Totalt|Summa)[:\s]*(?:EUR|€|\$|£|kr|SEK)?\s*([0-9][0-9.,]*)\s*(?:EUR|€|\$|£|kr|SEK)?/gi,
    /(?:EUR|€)\s*([0-9][0-9.,]*)/gi,
    /([0-9]+[.,][0-9]{2})\s*(?:EUR|€)/g,
    /\$\s*([0-9][0-9.,]*)/g,
    /£\s*([0-9][0-9.,]*)/g,
    /([0-9]+[.,][0-9]{2})\s*kr/gi,
    /kr\s*([0-9][0-9.,]*)/gi,
    /([0-9]+[.,][0-9]{2})\s*SEK/gi,
    /SEK\s*([0-9][0-9.,]*)/gi,
  ];

  for (const pattern of pricePatterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) {
        const amount = parsePrice(match[1]);
        if (amount > 0) {
          return {
            amount,
            currency: detectCurrency(text),
          };
        }
      }
    }
  }

  return null;
}
