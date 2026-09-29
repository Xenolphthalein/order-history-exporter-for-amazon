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
  '(?:\\b(?:EUR|GBP|USD|SEK|AUD|CAD|MXN|BRL|JPY|INR|KR|AED)\\b|€|£|\\$|R\\$|¥|₹)';

/**
 * Map of Amazon domains to their default currencies.
 * Used to disambiguate the $ symbol (USD, AUD, CAD, MXN, BRL, etc.).
 */
const DOMAIN_CURRENCY_MAP: Record<string, string> = {
  'amazon.ae': 'AED',
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
  } else if (text.includes('AED')) {
    return 'AED';
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
 * Parse an amount string that may be prefixed/suffixed with any supported
 * currency symbol or code (e.g. "EUR 40,00", "-19,10 €", "R$ 40,00").
 */
export function parseCurrencyAmount(text: string): number {
  return parsePrice(text.replace(new RegExp(CURRENCY_TOKEN, 'gi'), '').trim());
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
      `(?:Summe|Gesamtsumme|Gesamt|Total|Totale|Totalt|Summa)[:\\s]*${CT}?\\s*([0-9][0-9.,]*)\\s*${CT}?`,
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

/**
 * Matches known "total" labels across supported locales. Uses a prefix
 * match (not an exact word list) so locale variants sharing a common root
 * with the generic "Total" (e.g. Italian "Totale") are matched without
 * needing to enumerate every inflection.
 */
const TOTAL_LABEL_PATTERN = /^(total|totale|summe|gesamt|totalt|summa)\b/i;

/**
 * Extract the order total from label/value row pairs scraped from the order
 * header (Amazon's order-history page structure: a caption like "Totale"
 * followed by a value like "13,99 €", as two sibling elements).
 *
 * This is preferred over scanning the whole order card's text because that
 * text also contains the shipping address, item titles, etc. — a plain
 * currency-adjacent-number scan can pick up unrelated digits from there
 * (e.g. a postal code) when the label isn't recognized.
 */
export function extractTotalFromRows(
  rows: { label: string; value: string }[],
  hostname?: string
): { amount: number; currency: string } | null {
  for (const row of rows) {
    if (TOTAL_LABEL_PATTERN.test(row.label.trim())) {
      // Include the label so the labeled-total pattern matches instead of
      // the currency-suffix fallback, which only captures the last decimal
      // group (e.g. "234,56" out of "1.234,56 €").
      const result = extractPriceFromText(`${row.label} ${row.value}`, hostname);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Matches gift-card line-item labels across supported locales (the ones
 * already used elsewhere in this codebase: de, en, fr, sv, es, it). Amazon's
 * order-details "charge summary" lists a deduction row like "Importo Buono
 * Regalo: -19,10 €" when a gift card covers part or all of an order.
 */
const GIFT_CARD_LABEL_PATTERN =
  /(gift\s*card|geschenkgutschein|ch[eè]que[\s-]?cadeau|carte[\s-]?cadeau|presentkort|tarjeta\s*(de\s*)?regalo|cheque\s*regalo|buono\s*regalo)/i;

/**
 * Matches a trailing "total refund" row across locales. When an order was
 * returned, Amazon appends this row (e.g. "Totale rimborso: 23,19 €") after
 * the normal charge-summary rows — it describes what was refunded, not what
 * was charged, and must be excluded before picking the "last row" as the
 * charged amount.
 */
const REFUND_TOTAL_LABEL_PATTERN =
  /(total\s*refund|r[uü]ckerstattungsbetrag|montant\s*rembours[eé]|[aå]terbetalt\s*belopp|importe\s*reembolsado|totale\s*rimborso)/i;

/**
 * Summarize the order-details "charge summary" rows (Amazon's
 * `[data-component="chargeSummary"]` line-item list: item subtotal,
 * shipping, tax, running total, and — when applicable — a gift-card
 * deduction followed by a final total). Any trailing "total refund" row
 * (present when the order was returned) is excluded first.
 *
 * `chargedAmount` is the amount of the LAST (non-refund) row, which Amazon
 * always renders as the running total after any deductions — this works
 * regardless of locale since it doesn't depend on matching a "total" label,
 * just row order. `giftCardAmount` sums whichever rows look like a
 * *negative* gift card deduction, so a fully gift-card-covered order ends
 * up with `chargedAmount: 0` and `giftCardAmount` equal to what the card
 * covered. A positive row with a gift-card-like label (e.g. buying a gift
 * card itself as a product, paid normally) is correctly not counted.
 */
export function summarizePaymentRows(rows: { label: string; amount: number }[]): {
  chargedAmount: number | null;
  giftCardAmount: number;
} {
  const chargeRows = rows.filter((row) => !REFUND_TOTAL_LABEL_PATTERN.test(row.label));

  if (chargeRows.length === 0) {
    return { chargedAmount: null, giftCardAmount: 0 };
  }

  const chargedAmount = chargeRows[chargeRows.length - 1]?.amount ?? null;
  // A real gift-card deduction is always negative (e.g. "-19,10 €"). A
  // positive row matching the label text instead means the gift card was
  // the *product being purchased* (paid normally, e.g. by card) rather than
  // a payment method — checking the sign avoids conflating the two.
  const giftCardAmount = chargeRows
    .filter((row) => row.amount < 0 && GIFT_CARD_LABEL_PATTERN.test(row.label))
    .reduce((sum, row) => sum + Math.abs(row.amount), 0);

  return { chargedAmount, giftCardAmount: Math.round(giftCardAmount * 100) / 100 };
}
