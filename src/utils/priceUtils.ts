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
 * (amazon.co.uk, amazon.com, amazon.com.mx, amazon.com.au, etc.)
 * instead of silently returning 0.
 * Keep in sync with detectCurrency and DOMAIN_CURRENCY_MAP below.
 *
 * ISO codes are wrapped with \\b to prevent accidental substring matches
 * inside product names/descriptions (e.g. "fraud" matching AUD).
 * Symbols are self-delimiting and don't need word boundaries.
 */
export const CURRENCY_TOKEN =
  '(?:\\b(?:EUR|GBP|USD|SEK|AUD|CAD|MXN|BRL|JPY|INR|KR)\\b|€|£|\\$|R\\$|¥|₹)';

/**
 * Map of Amazon domains to their default currencies.
 * Used to disambiguate the $ symbol (USD, AUD, CAD, MXN, BRL, etc.).
 */
const DOMAIN_CURRENCY_MAP: Record<string, string> = {
  'amazon.com': 'USD',
  'amazon.com.au': 'AUD',
  'amazon.ca': 'CAD',
  'amazon.com.mx': 'MXN',
  'amazon.com.br': 'BRL',
  'amazon.co.jp': 'JPY',
  'amazon.in': 'INR',
  'amazon.co.uk': 'GBP',
  'amazon.se': 'SEK',
  'amazon.de': 'EUR',
  'amazon.fr': 'EUR',
  'amazon.it': 'EUR',
  'amazon.es': 'EUR',
  'amazon.com.be': 'EUR',
};

/**
 * Resolve the default currency for an Amazon domain hostname.
 * Returns null when the hostname does not match a known domain.
 */
export function getCurrencyForDomain(hostname: string): string | null {
  const normalized = hostname.toLowerCase();
  for (const [domain, currency] of Object.entries(DOMAIN_CURRENCY_MAP)) {
    if (normalized === domain || normalized.endsWith(`.${domain}`)) {
      return currency;
    }
  }
  return null;
}

/**
 * Detect currency from text content.
 * When `hostname` is provided, uses the domain to disambiguate
 * the $ symbol (e.g. amazon.com.mx → MXN, amazon.com.au → AUD).
 */
export function detectCurrency(text: string, hostname?: string): string {
  if (text.includes('€') || text.includes('EUR')) {
    return 'EUR';
  } else if (text.includes('£') || text.includes('GBP')) {
    return 'GBP';
  } else if (text.includes('R$') || text.includes('BRL')) {
    return 'BRL';
  } else if (text.includes('¥') || text.includes('JPY')) {
    return 'JPY';
  } else if (text.includes('₹') || text.includes('INR')) {
    return 'INR';
  } else if (text.includes('AUD')) {
    return 'AUD';
  } else if (text.includes('CAD')) {
    return 'CAD';
  } else if (text.includes('MXN')) {
    return 'MXN';
  } else if (text.includes('USD')) {
    return 'USD';
  } else if (text.includes('$')) {
    if (hostname) {
      const domainCurrency = getCurrencyForDomain(hostname);
      if (domainCurrency) {
        return domainCurrency;
      }
    }
    return 'USD';
  } else if (/(?:\d[\d.,]*\s*kr|kr\s*\d[\d.,]*|SEK)/i.test(text)) {
    return 'SEK';
  }
  // Default to domain currency when available, otherwise EUR
  if (hostname) {
    const domainCurrency = getCurrencyForDomain(hostname);
    if (domainCurrency) return domainCurrency;
  }
  return 'EUR'; // Default
}

/**
 * Extract price from text using common patterns.
 * When `hostname` is provided, it is forwarded to `detectCurrency` to
 * disambiguate currency symbols (e.g. $ on amazon.com.mx → MXN).
 */
export function extractPriceFromText(
  text: string,
  hostname?: string
): { amount: number; currency: string } | null {
  const CT = CURRENCY_TOKEN;
  const pricePatterns = [
    // Labeled totals with optional currency prefix/suffix (e.g. "Total: $12.99")
    new RegExp(
      `(?:Summe|Gesamtsumme|Gesamt|Total|Totalt|Summa)[:\\s]*${CT}?\\s*([0-9][0-9.,]*)\\s*${CT}?`,
      'gi'
    ),
    // Currency-prefixed amounts (e.g. "$ 29.99", "EUR 12,99")
    new RegExp(`${CT}\\s*([0-9][0-9.,]*)`, 'gi'),
    // Currency-suffixed amounts (e.g. "199,00 kr", "12.99 EUR")
    new RegExp(`([0-9]+[.,][0-9]{2})\\s*${CT}`, 'gi'),
  ];

  for (const pattern of pricePatterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[1]) {
        const amount = parsePrice(match[1]);
        if (amount > 0) {
          return {
            amount,
            currency: detectCurrency(text, hostname),
          };
        }
      }
    }
  }

  return null;
}
