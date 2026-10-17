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
    keywords: [
      'Delivered',
      'Likely delivered',
      'Arriving',
      'Shipped',
      'Cancelled',
      'Return complete',
      'Return started',
      'Returned',
      'Refunded',
    ],
  },
  {
    locale: 'fr',
    keywords: [
      'Livré',
      'Livre',
      'Probablement livré',
      'Probablement livre',
      'Remis',
      'Arrive',
      'Arrivé',
      'Expédié',
      'Expedie',
      'En cours',
      'Annulé',
      'Annule',
      'Retour terminé',
      'Retour termine',
      'Retourné',
      'Retourne',
      'Remboursé',
      'Rembourse',
    ],
  },
  {
    locale: 'sv',
    keywords: [
      'Levererad',
      'Levererat',
      'Troligen levererad',
      'Troligen levererat',
      'Skickad',
      'Skickat',
      'Avbruten',
      'Avbrutet',
      'Returnerad',
      'Returnerat',
      'Återbetalad',
      'Återbetalat',
      'Aterbetalad',
      'Aterbetalat',
      'Retur slutförd',
      'Retur slutfört',
      'Retur slutford',
      'Retur slutfort',
      'Retur påbörjad',
      'Retur påbörjat',
      'Retur paborjad',
      'Retur paborjat',
      'Anländer',
      'Anlander',
    ],
  },
  {
    locale: 'es',
    keywords: [
      'Entregado',
      'Entregada',
      'Probablemente entregado',
      'Probablemente entregada',
      'Enviado',
      'Enviada',
      'En camino',
      'Llegando',
      'Cancelado',
      'Cancelada',
      'Devuelto',
      'Devuelta',
      'Devolución completada',
      'Devolución finalizada',
      'Devolucion completada',
      'Devolucion finalizada',
      'Devolución iniciada',
      'Devolucion iniciada',
      'Devolución',
      'Devolucion',
      'Reembolsado',
      'Reembolsada',
      'Reembolso',
      'Reintegrado',
      'Reintegrada',
    ],
  },
  {
    locale: 'it',
    keywords: [
      'Consegnato',
      'Consegnata',
      'Ritirato',
      'Ritirata',
      'Probabile consegna',
      'Consegna prevista',
      'In arrivo',
      'Spedito',
      'Spedita',
      'Annullato',
      'Annullata',
      'Reso completato',
      'Reso avviato',
      'Restituito',
      'Restituita',
      'Rimborsato',
      'Rimborsata',
      'Rimborso',
    ],
  },
];

/**
 * Japanese status lines aren't space-separated and often lead with the date
 * ("10月15日に配達しました", "明日お届け予定"), so they can't use the
 * keyword-first, word-by-word pattern above. Instead, a short line that
 * starts with an optional date/kanji prefix followed by a status keyword is
 * returned whole.
 */
const japaneseStatusKeywords = [
  '配達しました',
  '配達済み',
  '配達完了',
  'お届け済み',
  '発送しました',
  '発送済み',
  'お届け予定',
  '到着予定',
  '配達予定',
  'キャンセルされました',
  'キャンセル済み',
  '返品が完了しました',
  '返品完了',
  '返品済み',
  '返金しました',
  '返金済み',
];

const JAPANESE_STATUS_MAX_LENGTH = 40;

const japaneseStatusPattern = new RegExp(
  `^[0-9０-９/:：()（）\\s\\p{Script=Han}]{0,16}?に?(?:${japaneseStatusKeywords.join('|')})`,
  'u'
);

const blockedStatusCandidates: RegExp[] = [/^Shipped\s+and\s+sold\b/iu];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const statusPatterns: RegExp[] = localeStatusConfigs.map((config) => {
  const keywords = config.keywords.map((keyword) => escapeRegex(keyword)).join('|');
  return new RegExp(`^((?:${keywords})(?:\\s+${STATUS_TOKEN}+){0,7})`, 'iu');
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

    if (candidate.length <= JAPANESE_STATUS_MAX_LENGTH && japaneseStatusPattern.test(candidate)) {
      return candidate;
    }
  }

  return '';
}
