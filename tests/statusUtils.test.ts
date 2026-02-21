import { describe, it, expect } from 'vitest';
import { parseOrderStatus } from '../src/utils/statusUtils';

describe('parseOrderStatus', () => {
  it('should extract German delivery status with umlaut date text', () => {
    const text =
      'Bestellnummer: 123-4567890-1234567\nZugestellt am Dienstag, 12. März 2024\nArtikel';
    expect(parseOrderStatus(text)).toBe('Zugestellt am Dienstag, 12. März 2024');
  });

  it('should extract English delivery status from a dedicated line', () => {
    const text = 'Order #123-4567890-1234567\nDelivered Tuesday, January 16\nProduct XYZ';
    expect(parseOrderStatus(text)).toBe('Delivered Tuesday, January 16');
  });

  it('should extract French status with accents', () => {
    const text = 'Commande n° 123-4567890-1234567\nLivré le mardi 12 mars 2024\nVoir votre article';
    expect(parseOrderStatus(text)).toBe('Livré le mardi 12 mars 2024');
  });

  it('should extract cancellation/refund statuses', () => {
    expect(parseOrderStatus('Annulé le 2 février 2024')).toBe('Annulé le 2 février 2024');
    expect(parseOrderStatus('Refunded on January 10, 2024')).toBe('Refunded on January 10, 2024');
  });

  it('should not match status words in the middle of unrelated text', () => {
    const text = 'This product is not shipped yet but advertisement card';
    expect(parseOrderStatus(text)).toBe('');
  });

  it('should not match non-status "shipped and sold by" copy', () => {
    const text = 'Shipped and sold by Amazon EU S.a.r.L. Invoice available';
    expect(parseOrderStatus(text)).toBe('');
  });

  it('should return empty string when no status exists', () => {
    expect(parseOrderStatus('Order #123-4567890-1234567 Product XYZ')).toBe('');
  });
});
