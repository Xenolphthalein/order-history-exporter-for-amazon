/**
 * Date parsing and formatting utilities
 */

const germanMonths: Record<string, number> = {
  januar: 1,
  februar: 2,
  märz: 3,
  april: 4,
  mai: 5,
  juni: 6,
  juli: 7,
  august: 8,
  september: 9,
  oktober: 10,
  november: 11,
  dezember: 12,
};

const englishMonths: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const frenchMonths: Record<string, number> = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12,
};

const allMonths: Record<string, number> = { ...germanMonths, ...englishMonths, ...frenchMonths };
const germanMonthNames =
  'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
const frenchMonthNames =
  'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre';
const englishMonthNames =
  'January|February|March|April|May|June|July|August|September|October|November|December';

const orderDatePatterns: RegExp[] = [
  new RegExp(
    `(?:Bestellt am|Bestellung aufgegeben am)\\s+(\\d{1,2}\\.?\\s*(?:${germanMonthNames})\\s+\\d{4})\\b`,
    'iu'
  ),
  new RegExp(`\\b(\\d{1,2}\\.?\\s*(?:${germanMonthNames})\\s+\\d{4})\\b`, 'iu'),
  new RegExp(
    `(?:Commandé le|Commande passée le)\\s+(\\d{1,2}(?:er)?\\s*(?:${frenchMonthNames})\\s+\\d{4})\\b`,
    'iu'
  ),
  new RegExp(`\\b(\\d{1,2}(?:er)?\\s*(?:${frenchMonthNames})\\s+\\d{4})\\b`, 'iu'),
  new RegExp(
    `(?:Order placed|Ordered on)\\s+((?:${englishMonthNames})\\s+\\d{1,2},?\\s+\\d{4})\\b`,
    'iu'
  ),
  new RegExp(`\\b((?:${englishMonthNames})\\s+\\d{1,2},?\\s+\\d{4})\\b`, 'iu'),
];

function getDateCandidates(orderText: string): string[] {
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
 * Parse date string to ISO format (YYYY-MM-DD)
 * Supports German format "15. Januar 2024", English format "January 15, 2024",
 * and French format "15 janvier 2024".
 */
export function parseDate(dateText: string): string | null {
  if (!dateText) return null;

  const cleanText = dateText.trim().toLowerCase();

  // Day-Month-Year: "15. Januar 2024", "15 janvier 2024", "1er février 2024"
  const dayMonthYearMatch = cleanText.match(/(\d{1,2})(?:er)?\.?\s*([\p{L}]+)\s*(\d{4})/iu);
  if (dayMonthYearMatch) {
    const day = parseInt(dayMonthYearMatch[1] || '0', 10);
    const monthName = (dayMonthYearMatch[2] || '').toLowerCase();
    const year = parseInt(dayMonthYearMatch[3] || '0', 10);

    if (year >= 2000 && year <= 2100 && allMonths[monthName]) {
      const month = allMonths[monthName];
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // English: "January 15, 2024"
  const englishMatch = cleanText.match(/([a-z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (englishMatch) {
    const monthName = (englishMatch[1] || '').toLowerCase();
    const day = parseInt(englishMatch[2] || '0', 10);
    const year = parseInt(englishMatch[3] || '0', 10);

    if (year >= 2000 && year <= 2100 && allMonths[monthName]) {
      const month = allMonths[monthName];
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Extract and parse order date from order card text.
 * Returns ISO date string (YYYY-MM-DD) or empty string when no valid date is found.
 */
export function parseOrderDate(orderText: string): string {
  if (!orderText) return '';

  const candidates = getDateCandidates(orderText);

  for (const candidate of candidates) {
    for (const pattern of orderDatePatterns) {
      const match = candidate.match(pattern);
      if (match?.[1]) {
        const parsedDate = parseDate(match[1]);
        if (parsedDate && parsedDate.startsWith('20')) {
          return parsedDate;
        }
      }
    }
  }

  return '';
}

/**
 * Extract a four-digit order-history year from text values used in Amazon filter UI.
 */
export function extractOrderYear(value: string): string | null {
  if (!value) return null;
  const yearMatch = value.match(/year-?(20\d{2})/i) || value.match(/\b(20\d{2})\b/);
  return yearMatch?.[1] || null;
}

/**
 * Filter years based on a date range
 */
export function filterYearsByDateRange(
  years: string[],
  startDate: string | null,
  endDate: string | null
): string[] {
  if (!startDate || !endDate) {
    return years;
  }

  const startYear = new Date(startDate).getFullYear();
  const endYear = new Date(endDate).getFullYear();

  return years.filter((year) => {
    const yearNum = parseInt(year, 10);
    return yearNum >= startYear && yearNum <= endYear;
  });
}
