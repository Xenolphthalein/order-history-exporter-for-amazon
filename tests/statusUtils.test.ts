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

  it('should extract French "Retour terminé"', () => {
    const text = 'Commande effectuée le 7 mai 2026\nRetour terminé\nVotre retour a été traité.';
    expect(parseOrderStatus(text)).toBe('Retour terminé');
  });

  it('should extract French "Probablement livré le <date>"', () => {
    const text =
      'N° de commande 171-5801076-8827565\nProbablement livré le 30 avril\nMr.Kaplan Lot';
    expect(parseOrderStatus(text)).toBe('Probablement livré le 30 avril');
  });

  it('should extract English "Return complete"', () => {
    const text = 'Order #123-4567890-1234567\nReturn complete\nYour refund was issued.';
    expect(parseOrderStatus(text)).toBe('Return complete');
  });

  it('should extract English "Return started"', () => {
    const text = 'Order #123-4567890-1234567\nReturn started\nWe received your return request.';
    expect(parseOrderStatus(text)).toBe('Return started');
  });

  it('should extract English "Likely delivered <date>"', () => {
    const text = 'Order #123-4567890-1234567\nLikely delivered 30 April\nProduct XYZ';
    expect(parseOrderStatus(text)).toBe('Likely delivered 30 April');
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

  it('should extract Swedish delivery status', () => {
    const text = 'Beställningsnummer: 123-4567890-1234567\nLevererad den 12 mars 2024\nArtikel';
    expect(parseOrderStatus(text)).toBe('Levererad den 12 mars 2024');
  });

  it('should extract Swedish cancellation status', () => {
    const text = 'Avbruten den 2 februari 2024';
    expect(parseOrderStatus(text)).toBe('Avbruten den 2 februari 2024');
  });

  it('should extract Swedish shipped status', () => {
    const text = 'Beställningsnummer: 123-4567890-1234567\nSkickad den 5 april 2024\nArtikel';
    expect(parseOrderStatus(text)).toBe('Skickad den 5 april 2024');
  });

  it('should extract Swedish "Retur slutförd"', () => {
    const text = 'Beställning gjord den 7 maj 2026\nRetur slutförd\nDin retur har behandlats.';
    expect(parseOrderStatus(text)).toBe('Retur slutförd');
  });

  it('should extract Swedish "Troligen levererad"', () => {
    const text = 'Beställningsnr 171-5801076-8827565\nTroligen levererad den 30 april\nProdukt';
    expect(parseOrderStatus(text)).toBe('Troligen levererad den 30 april');
  });

  it('should extract Swedish "Retur påbörjad"', () => {
    const text =
      'Beställning 123-4567890-1234567\nRetur påbörjad\nVi har mottagit din returförfrågan.';
    expect(parseOrderStatus(text)).toBe('Retur påbörjad');
  });

  it('should extract Swedish unaccented status variants', () => {
    expect(parseOrderStatus('Aterbetalad den 10 januari 2024')).toBe(
      'Aterbetalad den 10 januari 2024'
    );
    expect(parseOrderStatus('Retur slutford')).toBe('Retur slutford');
    expect(parseOrderStatus('Anlander')).toBe('Anlander');
  });
});
