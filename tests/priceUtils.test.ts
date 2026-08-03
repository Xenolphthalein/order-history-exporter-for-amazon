import { describe, it, expect } from 'vitest';
import {
  parsePrice,
  detectCurrency,
  extractPriceFromText,
  CURRENCY_TOKEN,
} from '../src/utils/priceUtils';

describe('parsePrice', () => {
  describe('European format', () => {
    it('should parse "12,99" as 12.99', () => {
      expect(parsePrice('12,99')).toBe(12.99);
    });

    it('should parse "1.234,56" as 1234.56', () => {
      expect(parsePrice('1.234,56')).toBe(1234.56);
    });

    it('should parse "99,00" as 99.00', () => {
      expect(parsePrice('99,00')).toBe(99);
    });

    it('should parse large European numbers', () => {
      expect(parsePrice('12.345,67')).toBe(12345.67);
    });
  });

  describe('US format', () => {
    it('should parse "12.99" as 12.99', () => {
      expect(parsePrice('12.99')).toBe(12.99);
    });

    it('should parse "1,234.56" as 1234.56', () => {
      expect(parsePrice('1,234.56')).toBe(1234.56);
    });

    it('should parse "99.00" as 99.00', () => {
      expect(parsePrice('99.00')).toBe(99);
    });

    it('should handle thousands separator only', () => {
      expect(parsePrice('1,234')).toBe(1234);
    });
  });

  describe('edge cases', () => {
    it('should return 0 for empty string', () => {
      expect(parsePrice('')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(parsePrice('  12.99  ')).toBe(12.99);
    });

    it('should return 0 for non-numeric strings', () => {
      expect(parsePrice('abc')).toBe(0);
    });

    it('should parse simple integers', () => {
      expect(parsePrice('100')).toBe(100);
    });
  });
});

describe('CURRENCY_TOKEN', () => {
  const itemPricePattern = new RegExp(`${CURRENCY_TOKEN}\\s*([0-9]+[.,][0-9]{2})`, 'i');

  it('should match a euro price', () => {
    expect('€12,99'.match(itemPricePattern)?.[1]).toBe('12,99');
  });

  it('should match a pound price', () => {
    expect('£12.99'.match(itemPricePattern)?.[1]).toBe('12.99');
  });

  it('should match a dollar price', () => {
    expect('$12.99'.match(itemPricePattern)?.[1]).toBe('12.99');
  });

  it('should match currency codes', () => {
    expect('GBP 12.99'.match(itemPricePattern)?.[1]).toBe('12.99');
    expect('USD 12.99'.match(itemPricePattern)?.[1]).toBe('12.99');
    expect('EUR 12,99'.match(itemPricePattern)?.[1]).toBe('12,99');
  });

  it('should match a krona price', () => {
    expect('kr 199,00'.match(itemPricePattern)?.[1]).toBe('199,00');
  });

  it('should match a SEK price', () => {
    expect('SEK 199,00'.match(itemPricePattern)?.[1]).toBe('199,00');
  });

  it('should not match a bare number', () => {
    expect('12.99'.match(itemPricePattern)).toBeNull();
  });
});

describe('detectCurrency', () => {
  it('should detect EUR from € symbol', () => {
    expect(detectCurrency('€12.99')).toBe('EUR');
  });

  it('should detect EUR from EUR text', () => {
    expect(detectCurrency('Total: EUR 12.99')).toBe('EUR');
  });

  it('should detect GBP from £ symbol', () => {
    expect(detectCurrency('£12.99')).toBe('GBP');
  });

  it('should detect GBP from GBP text', () => {
    expect(detectCurrency('Total: GBP 12.99')).toBe('GBP');
  });

  it('should detect USD from $ symbol', () => {
    expect(detectCurrency('$12.99')).toBe('USD');
  });

  it('should detect USD from USD text', () => {
    expect(detectCurrency('Total: USD 12.99')).toBe('USD');
  });

  it('should default to EUR when no currency found', () => {
    expect(detectCurrency('Total: 12.99')).toBe('EUR');
  });

  it('should prioritize EUR when multiple currencies present', () => {
    expect(detectCurrency('€12.99 ($15.00)')).toBe('EUR');
  });

  it('should detect SEK from kr text', () => {
    expect(detectCurrency('Total: 199,00 kr')).toBe('SEK');
  });

  it('should detect SEK from kr without space', () => {
    expect(detectCurrency('199,00kr')).toBe('SEK');
  });

  it('should detect SEK from SEK text', () => {
    expect(detectCurrency('Total: SEK 199,00')).toBe('SEK');
  });

  it('should not match kr as a substring inside a word', () => {
    expect(detectCurrency('Skrivbord 199,00')).toBe('EUR');
  });

  describe('domain-aware currency detection', () => {
    it('should return MXN for $ on amazon.com.mx', () => {
      expect(detectCurrency('$683.23', 'www.amazon.com.mx')).toBe('MXN');
    });

    it('should return AUD for $ on amazon.com.au', () => {
      expect(detectCurrency('$49.99', 'www.amazon.com.au')).toBe('AUD');
    });

    it('should return CAD for $ on amazon.ca', () => {
      expect(detectCurrency('$29.99', 'www.amazon.ca')).toBe('CAD');
    });

    it('should return BRL for $ on amazon.com.br', () => {
      expect(detectCurrency('$199.99', 'www.amazon.com.br')).toBe('BRL');
    });

    it('should return USD for $ on amazon.com', () => {
      expect(detectCurrency('$12.99', 'www.amazon.com')).toBe('USD');
    });

    it('should return USD for $ when no hostname provided', () => {
      expect(detectCurrency('$12.99')).toBe('USD');
    });

    it('should return USD for $ on unknown domain', () => {
      expect(detectCurrency('$12.99', 'unknown.example.com')).toBe('USD');
    });

    it('should use domain currency as default when no symbol found', () => {
      expect(detectCurrency('Total: 12.99', 'www.amazon.com.mx')).toBe('MXN');
      expect(detectCurrency('Total: 12.99', 'www.amazon.com.au')).toBe('AUD');
      expect(detectCurrency('Total: 12.99', 'www.amazon.de')).toBe('EUR');
    });

    it('should still prefer explicit symbols over domain', () => {
      // € on a $ marketplace should still be EUR
      expect(detectCurrency('€12.99', 'www.amazon.com')).toBe('EUR');
      // £ on any domain is GBP
      expect(detectCurrency('£12.99', 'www.amazon.com.mx')).toBe('GBP');
    });

    it('should return USD for explicit USD text on non-US domain', () => {
      // "USD" is an explicit currency code and should not be overridden by domain
      expect(detectCurrency('Total: USD 12.99', 'www.amazon.com.mx')).toBe('USD');
      expect(detectCurrency('Total: USD 12.99', 'www.amazon.com.au')).toBe('USD');
      expect(detectCurrency('Total: USD 12.99', 'www.amazon.ca')).toBe('USD');
    });

    it('should detect explicit currency symbols and codes from new marketplaces', () => {
      // R$ / BRL
      expect(detectCurrency('R$ 19,90')).toBe('BRL');
      expect(detectCurrency('Total: BRL 199,99')).toBe('BRL');
      // ¥ / JPY
      expect(detectCurrency('¥ 1200')).toBe('JPY');
      expect(detectCurrency('Total: JPY 5000')).toBe('JPY');
      // ₹ / INR
      expect(detectCurrency('₹ 499,00')).toBe('INR');
      expect(detectCurrency('Total: INR 1499')).toBe('INR');
      // AUD
      expect(detectCurrency('Total: AUD 49.99')).toBe('AUD');
      // CAD
      expect(detectCurrency('Total: CAD 29.99')).toBe('CAD');
      // MXN
      expect(detectCurrency('Total: MXN 683.23')).toBe('MXN');
    });

    it('should prefer R$ over $ when both are present', () => {
      expect(detectCurrency('R$ 19,90', 'www.amazon.com')).toBe('BRL');
    });
  });
});

describe('extractPriceFromText', () => {
  describe('German/European patterns', () => {
    it('should extract from "Summe: EUR 12,99"', () => {
      const result = extractPriceFromText('Summe: EUR 12,99');
      expect(result).toEqual({ amount: 12.99, currency: 'EUR' });
    });

    it('should extract from "Gesamtsumme: €99,00"', () => {
      const result = extractPriceFromText('Gesamtsumme: €99,00');
      expect(result).toEqual({ amount: 99, currency: 'EUR' });
    });

    it('should extract from "Total EUR 1.234,56"', () => {
      const result = extractPriceFromText('Total EUR 1.234,56');
      expect(result).toEqual({ amount: 1234.56, currency: 'EUR' });
    });
  });

  describe('simple currency patterns', () => {
    it('should extract from "€ 45.99"', () => {
      const result = extractPriceFromText('Price: € 45.99');
      expect(result).toEqual({ amount: 45.99, currency: 'EUR' });
    });

    it('should extract from "$ 29.99"', () => {
      const result = extractPriceFromText('Price: $ 29.99');
      expect(result).toEqual({ amount: 29.99, currency: 'USD' });
    });

    it('should extract from "£ 19.99"', () => {
      const result = extractPriceFromText('Price: £ 19.99');
      expect(result).toEqual({ amount: 19.99, currency: 'GBP' });
    });
  });

  describe('Swedish/SEK patterns', () => {
    it('should extract from "Totalt: 199,00 kr"', () => {
      const result = extractPriceFromText('Totalt: 199,00 kr');
      expect(result).toEqual({ amount: 199, currency: 'SEK' });
    });

    it('should extract from "Summa: kr 299,00"', () => {
      const result = extractPriceFromText('Summa: kr 299,00');
      expect(result).toEqual({ amount: 299, currency: 'SEK' });
    });

    it('should extract from "Total: SEK 199,00"', () => {
      const result = extractPriceFromText('Total: SEK 199,00');
      expect(result).toEqual({ amount: 199, currency: 'SEK' });
    });

    it('should extract from bare "199,00 kr"', () => {
      const result = extractPriceFromText('199,00 kr');
      expect(result).toEqual({ amount: 199, currency: 'SEK' });
    });
  });

  describe('edge cases', () => {
    it('should return null when no price found', () => {
      expect(extractPriceFromText('No price here')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractPriceFromText('')).toBeNull();
    });

    it('should not match zero amounts', () => {
      expect(extractPriceFromText('Total: €0,00')).toBeNull();
    });

    it('should skip leading zero amounts and return the real total', () => {
      const result = extractPriceFromText('$0.00 $0.00 $0.00 $252.71');
      expect(result).toEqual({ amount: 252.71, currency: 'USD' });
    });

    it('should anchor on the labeled total when other amounts precede it', () => {
      const result = extractPriceFromText(
        'ORDER PLACED May 20, 2026 TOTAL $252.71 SHIP TO John Doe'
      );
      expect(result).toEqual({ amount: 252.71, currency: 'USD' });
    });

    it('should not treat a stray "$," token as a zero price', () => {
      const result = extractPriceFromText('$, $252.71');
      expect(result).toEqual({ amount: 252.71, currency: 'USD' });
    });
  });

  describe('domain-aware price extraction', () => {
    it('should forward hostname and return MXN for $ on amazon.com.mx', () => {
      const result = extractPriceFromText('Total: $683.23', 'www.amazon.com.mx');
      expect(result).toEqual({ amount: 683.23, currency: 'MXN' });
    });

    it('should forward hostname and return AUD for $ on amazon.com.au', () => {
      const result = extractPriceFromText('Total: $49.99', 'www.amazon.com.au');
      expect(result).toEqual({ amount: 49.99, currency: 'AUD' });
    });

    it('should forward hostname and return CAD for $ on amazon.ca', () => {
      const result = extractPriceFromText('Total: $29.99', 'www.amazon.ca');
      expect(result).toEqual({ amount: 29.99, currency: 'CAD' });
    });

    it('should use domain default when no currency symbol present', () => {
      const result = extractPriceFromText('Total: 683.23', 'www.amazon.com.mx');
      expect(result).toEqual({ amount: 683.23, currency: 'MXN' });
    });
  });
});
