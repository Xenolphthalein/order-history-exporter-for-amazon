import { describe, it, expect } from 'vitest';
import { escapeCSVValue, formatPromotionsForCSV, convertOrdersToCSV } from '../src/utils/csvUtils';
import type { Order } from '../src/types';

describe('escapeCSVValue', () => {
  it('should return simple values as-is', () => {
    expect(escapeCSVValue('hello')).toBe('hello');
  });

  it('should return numbers as strings', () => {
    expect(escapeCSVValue(123)).toBe('123');
    expect(escapeCSVValue(12.99)).toBe('12.99');
  });

  it('should wrap values with commas in quotes', () => {
    expect(escapeCSVValue('hello, world')).toBe('"hello, world"');
  });

  it('should wrap values with quotes in quotes and escape internal quotes', () => {
    expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""');
  });

  it('should wrap values with newlines in quotes', () => {
    expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"');
  });

  it('should handle undefined and null', () => {
    expect(escapeCSVValue(undefined)).toBe('');
    expect(escapeCSVValue(null as unknown as string)).toBe('');
  });

  it('should handle empty string', () => {
    expect(escapeCSVValue('')).toBe('');
  });

  it('should handle complex strings with multiple special characters', () => {
    expect(escapeCSVValue('Price: €10,99 "special"')).toBe('"Price: €10,99 ""special"""');
  });
});

describe('formatPromotionsForCSV', () => {
  it('should format single promotion', () => {
    const promotions = [{ description: 'Coupon discount', amount: 5.0 }];
    expect(formatPromotionsForCSV(promotions)).toBe('Coupon discount: €5');
  });

  it('should format multiple promotions with semicolon separator', () => {
    const promotions = [
      { description: 'Coupon', amount: 5.0 },
      { description: 'Prime', amount: 3.5 },
    ];
    expect(formatPromotionsForCSV(promotions)).toBe('Coupon: €5; Prime: €3.5');
  });

  it('should return empty string for no promotions', () => {
    expect(formatPromotionsForCSV([])).toBe('');
  });
});

describe('convertOrdersToCSV', () => {
  const createOrder = (overrides: Partial<Order> = {}): Order => ({
    orderId: '123-4567890-1234567',
    orderDate: '2024-01-15',
    totalAmount: 99.99,
    currency: 'EUR',
    items: [],
    orderStatus: 'Delivered',
    detailsUrl: 'https://amazon.de/order-details/123',
    promotions: [],
    totalSavings: 0,
    ...overrides,
  });

  it('should create CSV with headers', () => {
    const csv = convertOrdersToCSV([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // Just headers
    expect(lines[0]).toContain('csvHeaderOrderId');
  });

  it('should use custom header function', () => {
    const getHeader = (key: string) => key.replace('csvHeader', '');
    const csv = convertOrdersToCSV([], getHeader);
    expect(csv).toContain('OrderId');
  });

  it('should include order without items as single row', () => {
    const orders = [createOrder()];
    const csv = convertOrdersToCSV(orders);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // Header + 1 order
    expect(lines[1]).toContain('123-4567890-1234567');
    expect(lines[1]).toContain('2024-01-15');
  });

  it('should create multiple rows for order with items', () => {
    const orders = [
      createOrder({
        items: [
          {
            title: 'Product 1',
            asin: 'B000000001',
            quantity: 1,
            price: 29.99,
            discount: 0,
            itemUrl: 'https://amazon.de/dp/B000000001',
          },
          {
            title: 'Product 2',
            asin: 'B000000002',
            quantity: 2,
            price: 15.0,
            discount: 0,
            itemUrl: 'https://amazon.de/dp/B000000002',
          },
        ],
      }),
    ];
    const csv = convertOrdersToCSV(orders);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // Header + 2 items
    expect(lines[1]).toContain('Product 1');
    expect(lines[2]).toContain('Product 2');
  });

  it('should only include savings on first item row', () => {
    const orders = [
      createOrder({
        totalSavings: 10.0,
        items: [
          {
            title: 'Product 1',
            asin: 'B000000001',
            quantity: 1,
            price: 29.99,
            discount: 0,
            itemUrl: 'https://amazon.de/dp/B000000001',
          },
          {
            title: 'Product 2',
            asin: 'B000000002',
            quantity: 1,
            price: 15.0,
            discount: 0,
            itemUrl: 'https://amazon.de/dp/B000000002',
          },
        ],
      }),
    ];
    const csv = convertOrdersToCSV(orders);
    const lines = csv.split('\n');

    // First item row should have savings
    expect(lines[1]).toMatch(/,10,/);
    // Second item row should have empty savings field
    const secondRowParts = lines[2]!.split(',');
    // totalSavings is the 5th column (index 4)
    expect(secondRowParts[4]).toBe('');
  });

  it('should escape product titles with special characters', () => {
    const orders = [
      createOrder({
        items: [
          {
            title: 'Product "with quotes", and commas',
            asin: 'B000000001',
            quantity: 1,
            price: 29.99,
            discount: 0,
            itemUrl: 'https://amazon.de/dp/B000000001',
          },
        ],
      }),
    ];
    const csv = convertOrdersToCSV(orders);
    expect(csv).toContain('"Product ""with quotes"", and commas"');
  });
});
