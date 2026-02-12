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
  "janvier": 1, 
  "février": 2, 
  "mars": 3, 
  "avril": 4,
  "mai": 5, 
  "juin": 6, 
  "juillet": 7,
  "aout": 8,     
  "septembre": 9, 
  "octobre": 10, 
  "novembre": 11, 
  "decembre": 12
};

const allMonths: Record<string, number> = { ...germanMonths, ...englishMonths, ...frenchMonths };

/**
 * Parse date string to ISO format (YYYY-MM-DD)
 * Supports German format "15. Januar 2024" and English format "January 15, 2024"
 */
export function parseDate(dateText: string): string | null {
  if (!dateText) return null;

  const cleanText = dateText.trim().toLowerCase();

  // German: "15. Januar 2024"
  const germanMatch = cleanText.match(/(\d{1,2})\.?\s*([a-zäöü]+)\s*(\d{4})/i);
  if (germanMatch) {
    const day = parseInt(germanMatch[1] || '0', 10);
    const monthName = (germanMatch[2] || '').toLowerCase();
    const year = parseInt(germanMatch[3] || '0', 10);

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

  const frenchMatch = cleanText.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
  if (frenchMatch) {
      const day = parseInt(frenchMatch[1], 10);
      const monthName = frenchMatch[2].toLowerCase();
      const year = parseInt(frenchMatch[3], 10);
  
      if (year >= 2000 && year <= 2100 && frenchMonths[monthName]) {
          const month = frenchMonths[monthName];
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
  }

  return null;
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
