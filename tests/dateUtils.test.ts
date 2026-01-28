import { describe, it, expect } from 'vitest';
import { parseDate, filterYearsByDateRange } from '../src/utils/dateUtils';

describe('parseDate', () => {
  describe('German date format', () => {
    it('should parse "15. Januar 2024"', () => {
      expect(parseDate('15. Januar 2024')).toBe('2024-01-15');
    });

    it('should parse "1. Februar 2023"', () => {
      expect(parseDate('1. Februar 2023')).toBe('2023-02-01');
    });

    it('should parse "31. Dezember 2022"', () => {
      expect(parseDate('31. Dezember 2022')).toBe('2022-12-31');
    });

    it('should parse German date without period after day', () => {
      expect(parseDate('15 Januar 2024')).toBe('2024-01-15');
    });

    it('should parse März correctly (with umlaut)', () => {
      expect(parseDate('10. März 2024')).toBe('2024-03-10');
    });

    it('should handle case insensitivity', () => {
      expect(parseDate('15. JANUAR 2024')).toBe('2024-01-15');
    });

    it('should handle extra whitespace', () => {
      expect(parseDate('  15.  Januar   2024  ')).toBe('2024-01-15');
    });
  });

  describe('English date format', () => {
    it('should parse "January 15, 2024"', () => {
      expect(parseDate('January 15, 2024')).toBe('2024-01-15');
    });

    it('should parse "December 31, 2022"', () => {
      expect(parseDate('December 31, 2022')).toBe('2022-12-31');
    });

    it('should parse "March 1 2023" (without comma)', () => {
      expect(parseDate('March 1 2023')).toBe('2023-03-01');
    });

    it('should handle case insensitivity', () => {
      expect(parseDate('FEBRUARY 28, 2024')).toBe('2024-02-28');
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(parseDate(null as unknown as string)).toBeNull();
      expect(parseDate(undefined as unknown as string)).toBeNull();
    });

    it('should return null for invalid month name', () => {
      expect(parseDate('15. InvalidMonth 2024')).toBeNull();
    });

    it('should return null for year out of range', () => {
      expect(parseDate('15. Januar 1999')).toBeNull();
      expect(parseDate('15. Januar 2101')).toBeNull();
    });

    it('should return null for garbage input', () => {
      expect(parseDate('not a date')).toBeNull();
    });
  });
});

describe('filterYearsByDateRange', () => {
  const years = ['2025', '2024', '2023', '2022', '2021', '2020'];

  it('should filter years within date range', () => {
    const result = filterYearsByDateRange(years, '2022-01-01', '2024-12-31');
    expect(result).toEqual(['2024', '2023', '2022']);
  });

  it('should return single year when range is within one year', () => {
    const result = filterYearsByDateRange(years, '2023-06-01', '2023-12-31');
    expect(result).toEqual(['2023']);
  });

  it('should return all years when no date range specified', () => {
    const result = filterYearsByDateRange(years, null, null);
    expect(result).toEqual(years);
  });

  it('should return all years when only start date specified', () => {
    const result = filterYearsByDateRange(years, '2022-01-01', null);
    expect(result).toEqual(years);
  });

  it('should return all years when only end date specified', () => {
    const result = filterYearsByDateRange(years, null, '2024-12-31');
    expect(result).toEqual(years);
  });

  it('should return empty array when no years match', () => {
    const result = filterYearsByDateRange(years, '2010-01-01', '2015-12-31');
    expect(result).toEqual([]);
  });

  it('should handle edge year boundaries', () => {
    const result = filterYearsByDateRange(years, '2023-12-31', '2024-01-01');
    expect(result).toEqual(['2024', '2023']);
  });
});
