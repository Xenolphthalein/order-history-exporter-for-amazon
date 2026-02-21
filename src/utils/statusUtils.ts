/**
 * Order status parsing utilities
 */

const STATUS_TOKEN = "[\\p{L}\\d.,'’:/()\\-]";

type LocaleStatusConfig = {
  locale: string;
  keywords: string[];
};

const localeStatusConfigs: LocaleStatusConfig[] = [
  {
    locale: 'de',
    keywords: ['Zugestellt', 'Geliefert', 'Storniert'],
  },
  {
    locale: 'en',
    keywords: ['Delivered', 'Arriving', 'Shipped', 'Cancelled', 'Returned', 'Refunded'],
  },
  {
    locale: 'fr',
    keywords: [
      'Livré',
      'Livre',
      'Remis',
      'Arrive',
      'Arrivé',
      'Expédié',
      'Expedie',
      'En cours',
      'Annulé',
      'Annule',
      'Retourné',
      'Retourne',
      'Remboursé',
      'Rembourse',
    ],
  },
];

const blockedStatusCandidates: RegExp[] = [/^Shipped\s+and\s+sold\b/iu];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const statusPatterns: RegExp[] = localeStatusConfigs.map((config) => {
  const keywords = config.keywords.map((keyword) => escapeRegex(keyword)).join('|');
  return new RegExp(`^((?:${keywords})(?:\\s+${STATUS_TOKEN}+){0,5})`, 'iu');
});

function getStatusCandidates(orderText: string): string[] {
  const normalized = orderText.replace(/\u00a0/g, ' ').trim();
  if (!normalized) return [];

  const byLine = normalized
    .split(/\r?\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (byLine.length > 1) return byLine;

  const byChunk = normalized
    .split(/\s{2,}|\s[|]\s|\s[-–—]\s/)
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return byChunk.length > 0 ? byChunk : [normalized.replace(/\s+/g, ' ').trim()];
}

/**
 * Extract order status from order card text.
 * Returns empty string when no supported status pattern is found.
 */
export function parseOrderStatus(orderText: string): string {
  if (!orderText) return '';

  const candidates = getStatusCandidates(orderText);

  for (const candidate of candidates) {
    if (blockedStatusCandidates.some((pattern) => pattern.test(candidate))) {
      continue;
    }

    for (const pattern of statusPatterns) {
      const match = candidate.match(pattern);
      if (match?.[1]) {
        return match[1].trim().substring(0, 50);
      }
    }
  }

  return '';
}
