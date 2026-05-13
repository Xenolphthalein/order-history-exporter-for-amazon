/**
 * Payment-method parsing utilities.
 *
 * Amazon never exposes full card numbers (PCI-DSS). This module only
 * recognises what Amazon actually renders to the logged-in user on the
 * order details page: a card brand and the last 4 digits, e.g.
 * "Visa ending in 1234" / "Visa endet auf 1234" / "Visa se terminant par 1234".
 */

import type { PaymentMethod } from '../types';

const KNOWN_BRANDS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /\bvisa\b/i, canonical: 'Visa' },
  { pattern: /\bmaster\s*card\b/i, canonical: 'Mastercard' },
  { pattern: /\bamerican\s+express\b/i, canonical: 'American Express' },
  { pattern: /\bamex\b/i, canonical: 'American Express' },
  { pattern: /\bdiscover\b/i, canonical: 'Discover' },
  { pattern: /\bdiners\s*club\b/i, canonical: 'Diners Club' },
  { pattern: /\bjcb\b/i, canonical: 'JCB' },
  { pattern: /\bunionpay\b/i, canonical: 'UnionPay' },
];

// Phrases that immediately precede a 4-digit card suffix on the order
// details page, by locale. Keep these loose; Amazon shifts copy between
// experiments.
const LAST4_PHRASES = [
  // English
  /(?:ending\s+(?:in|with)|ends?\s+with|ending)\s+(?:in\s+)?(\d{4})\b/i,
  // German
  /endet\s+auf\s+(\d{4})\b/i,
  // French
  /se\s+terminant\s+par\s+(\d{4})\b/i,
  // Spanish
  /(?:que\s+termina|termina|terminada)\s+en\s+(\d{4})\b/i,
  // Generic masked forms: "**** 1234", "•••• 1234", "xxxx1234"
  /(?:\*{2,}|•{2,}|x{2,})\s*[-\s]?\s*(\d{4})\b/i,
];

/**
 * Extract a card brand from free text, if any known brand is mentioned.
 */
export function extractCardBrand(text: string): string {
  for (const { pattern, canonical } of KNOWN_BRANDS) {
    if (pattern.test(text)) return canonical;
  }
  return '';
}

/**
 * Extract a card last-4 from free text, if a recognisable suffix phrase is present.
 */
export function extractCardLast4(text: string): string {
  for (const pattern of LAST4_PHRASES) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

/**
 * Parse a payment method (brand + last 4) from a single block of text.
 */
export function parsePaymentMethodFromText(text: string): PaymentMethod | undefined {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return undefined;

  const last4 = extractCardLast4(compact);
  if (!last4) return undefined;

  const brand = extractCardBrand(compact) || 'Card';

  // Trim raw to a sensible length so it's safe in CSV.
  const raw = compact.length > 120 ? compact.slice(0, 120) : compact;

  return { brand, last4, raw };
}

/**
 * Parse the payment method from a parsed order-details DOM.
 *
 * Strategy: walk a handful of candidate containers that Amazon has used for
 * the "Payment Method" block across locales and templates. Return the first
 * confident hit (brand + last4). If we only get last4 with no brand, that's
 * still useful — surface it with brand="Card".
 */
export function parsePaymentMethodFromHtml(doc: Document): PaymentMethod | undefined {
  const candidateSelectors = [
    '#payment-information',
    '#paymentInformation',
    '[data-component="paymentMethod"]',
    '[class*="payment-method"]',
    '[class*="pmts-payment-instrument"]',
    '.pmts-payment-instrument-detail-box',
    '.a-box.payment-box',
    '#od-subtotals',
  ];

  for (const selector of candidateSelectors) {
    const containers = doc.querySelectorAll(selector);
    for (const el of containers) {
      const text = el.textContent || '';
      const parsed = parsePaymentMethodFromText(text);
      if (parsed) return parsed;
    }
  }

  // Last-ditch: scan the whole body. This is more brittle but Amazon
  // occasionally drops the canonical container, especially on legacy pages.
  const bodyText = doc.body?.textContent || '';
  return parsePaymentMethodFromText(bodyText);
}
