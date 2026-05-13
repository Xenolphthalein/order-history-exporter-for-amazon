import { describe, it, expect } from 'vitest';
import {
  extractCardBrand,
  extractCardLast4,
  parsePaymentMethodFromText,
} from '../src/utils/paymentUtils';

describe('extractCardBrand', () => {
  it('detects Visa', () => {
    expect(extractCardBrand('Visa ending in 1234')).toBe('Visa');
  });

  it('detects Mastercard with or without space', () => {
    expect(extractCardBrand('Mastercard ending in 1234')).toBe('Mastercard');
    expect(extractCardBrand('Master Card ending in 1234')).toBe('Mastercard');
  });

  it('detects American Express and Amex shorthand', () => {
    expect(extractCardBrand('American Express ending in 1234')).toBe('American Express');
    expect(extractCardBrand('Amex card 1234')).toBe('American Express');
  });

  it('returns empty string when no known brand is found', () => {
    expect(extractCardBrand('PayPal balance')).toBe('');
  });
});

describe('extractCardLast4', () => {
  it('parses the English "ending in N" phrase', () => {
    expect(extractCardLast4('Visa ending in 4242')).toBe('4242');
  });

  it('parses the German "endet auf N" phrase', () => {
    expect(extractCardLast4('Visa endet auf 4242')).toBe('4242');
  });

  it('parses the French "se terminant par N" phrase', () => {
    expect(extractCardLast4('Visa se terminant par 4242')).toBe('4242');
  });

  it('parses the Spanish "que termina en N" phrase', () => {
    expect(extractCardLast4('Visa que termina en 4242')).toBe('4242');
  });

  it('parses masked forms like **** 1234', () => {
    expect(extractCardLast4('Visa **** 4242')).toBe('4242');
    expect(extractCardLast4('Visa •••• 4242')).toBe('4242');
    expect(extractCardLast4('xxxx4242')).toBe('4242');
  });

  it('returns empty string when no last 4 is found', () => {
    expect(extractCardLast4('Payment: PayPal balance')).toBe('');
  });
});

describe('parsePaymentMethodFromText', () => {
  it('returns brand + last4 + raw for a clean English match', () => {
    const result = parsePaymentMethodFromText(
      'Payment Method: Visa ending in 4242 — Order total $42.00'
    );
    expect(result).toEqual({
      brand: 'Visa',
      last4: '4242',
      raw: 'Payment Method: Visa ending in 4242 — Order total $42.00',
    });
  });

  it('falls back to brand "Card" when only last4 is detectable', () => {
    const result = parsePaymentMethodFromText('Card ending in 4242');
    expect(result).toEqual({
      brand: 'Card',
      last4: '4242',
      raw: 'Card ending in 4242',
    });
  });

  it('parses German order details copy', () => {
    const result = parsePaymentMethodFromText(
      'Zahlungsmethode: Mastercard endet auf 1111. Bestellt am 13. Mai 2026.'
    );
    expect(result?.brand).toBe('Mastercard');
    expect(result?.last4).toBe('1111');
  });

  it('parses French order details copy', () => {
    const result = parsePaymentMethodFromText(
      'Mode de paiement : Visa se terminant par 9876. Commande passée le 13 mai 2026.'
    );
    expect(result?.brand).toBe('Visa');
    expect(result?.last4).toBe('9876');
  });

  it('parses Spanish order details copy', () => {
    const result = parsePaymentMethodFromText(
      'Método de pago: American Express que termina en 0005. Pedido del 13 de mayo de 2026.'
    );
    expect(result?.brand).toBe('American Express');
    expect(result?.last4).toBe('0005');
  });

  it('returns undefined when no card suffix can be found', () => {
    expect(parsePaymentMethodFromText('Payment Method: PayPal')).toBeUndefined();
    expect(parsePaymentMethodFromText('')).toBeUndefined();
  });

  it('truncates raw to a sensible length', () => {
    const long = 'Some prefix '.repeat(40) + 'Visa ending in 4242 ' + 'tail '.repeat(40);
    const result = parsePaymentMethodFromText(long);
    expect(result?.raw.length).toBeLessThanOrEqual(120);
  });
});
