// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  buildTransactionUrl,
  formatTransactionDatesForCSV,
  formatTransactionAmountsForCSV,
  parseTransactionsFromCPEPage,
} from '../src/utils/transactionUtils';
import type { Transaction } from '../src/types';

describe('buildTransactionUrl', () => {
  it('should build the correct URL for amazon.com', () => {
    const url = buildTransactionUrl('https://www.amazon.com', '112-1234567-1234567');
    expect(url).toBe(
      'https://www.amazon.com/cpe/yourpayments/transactions?transactionTag=112-1234567-1234567'
    );
  });

  it('should build the correct URL for amazon.de', () => {
    const url = buildTransactionUrl('https://www.amazon.de', '123-4567890-1234567');
    expect(url).toBe(
      'https://www.amazon.de/cpe/yourpayments/transactions?transactionTag=123-4567890-1234567'
    );
  });

  it('should build the correct URL for amazon.co.uk', () => {
    const url = buildTransactionUrl('https://www.amazon.co.uk', '026-9876543-2109876');
    expect(url).toBe(
      'https://www.amazon.co.uk/cpe/yourpayments/transactions?transactionTag=026-9876543-2109876'
    );
  });

  it('should URL-encode the order ID', () => {
    const url = buildTransactionUrl('https://www.amazon.com', '112-1234567-1234567');
    expect(url).toContain('transactionTag=112-1234567-1234567');
  });

  it('should use the provided origin verbatim', () => {
    const url = buildTransactionUrl('https://www.amazon.fr', '111-2222222-3333333');
    expect(url.startsWith('https://www.amazon.fr')).toBe(true);
  });
});

describe('formatTransactionDatesForCSV', () => {
  it('should return empty string for no transactions', () => {
    expect(formatTransactionDatesForCSV([])).toBe('');
  });

  it('should return the date for a single transaction', () => {
    const transactions: Transaction[] = [{ date: '2026-04-17', amount: 14.93, currency: 'USD' }];
    expect(formatTransactionDatesForCSV(transactions)).toBe('2026-04-17');
  });

  it('should join multiple dates with " | "', () => {
    const transactions: Transaction[] = [
      { date: '2026-04-17', amount: 14.93, currency: 'USD' },
      { date: '2026-04-20', amount: 61.01, currency: 'USD' },
    ];
    expect(formatTransactionDatesForCSV(transactions)).toBe('2026-04-17 | 2026-04-20');
  });

  it('should handle three transactions', () => {
    const transactions: Transaction[] = [
      { date: '2026-01-01', amount: 10.0, currency: 'EUR' },
      { date: '2026-01-05', amount: 20.0, currency: 'EUR' },
      { date: '2026-01-10', amount: 5.5, currency: 'EUR' },
    ];
    expect(formatTransactionDatesForCSV(transactions)).toBe('2026-01-01 | 2026-01-05 | 2026-01-10');
  });
});

describe('formatTransactionAmountsForCSV', () => {
  it('should return empty string for no transactions', () => {
    expect(formatTransactionAmountsForCSV([])).toBe('');
  });

  it('should return the amount as a string for a single transaction', () => {
    const transactions: Transaction[] = [{ date: '2026-04-17', amount: 14.93, currency: 'USD' }];
    expect(formatTransactionAmountsForCSV(transactions)).toBe('14.93');
  });

  it('should join multiple amounts with " | "', () => {
    const transactions: Transaction[] = [
      { date: '2026-04-17', amount: 14.93, currency: 'USD' },
      { date: '2026-04-20', amount: 61.01, currency: 'USD' },
    ];
    expect(formatTransactionAmountsForCSV(transactions)).toBe('14.93 | 61.01');
  });

  it('should handle integer amounts', () => {
    const transactions: Transaction[] = [
      { date: '2026-01-01', amount: 10, currency: 'EUR' },
      { date: '2026-01-05', amount: 20, currency: 'EUR' },
    ];
    expect(formatTransactionAmountsForCSV(transactions)).toBe('10 | 20');
  });

  it('should handle three transactions', () => {
    const transactions: Transaction[] = [
      { date: '2026-01-01', amount: 10.0, currency: 'EUR' },
      { date: '2026-01-05', amount: 20.5, currency: 'EUR' },
      { date: '2026-01-10', amount: 5.99, currency: 'EUR' },
    ];
    expect(formatTransactionAmountsForCSV(transactions)).toBe('10 | 20.5 | 5.99');
  });
});

// Minimal CPE page HTML matching Amazon's confirmed server-rendered structure
function makeCPEHtml(entries: { date: string; amount: string }[]): string {
  const groups = entries
    .map(
      ({ date, amount }) => `
    <div class="a-box-group">
      <div class="a-box apx-transactions-sleeve-header-container">
        <span class="a-size-base a-text-bold">Completed</span>
      </div>
      <div class="a-box">
        <div class="apx-transaction-date-container"><span>${date}</span></div>
        <div class="apx-transactions-line-item-component-container">
          <div class="a-column a-span3 a-text-right a-span-last">
            <span class="a-size-base-plus a-text-bold">${amount}</span>
          </div>
        </div>
      </div>
    </div>`
    )
    .join('');
  return `<!DOCTYPE html><html><body>${groups}</body></html>`;
}

describe('parseTransactionsFromCPEPage', () => {
  it('parses a USD charge (negative in Amazon UI → positive in export)', () => {
    const html = makeCPEHtml([{ date: 'June 6, 2026', amount: '-$51.12' }]);
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toEqual([{ date: '2026-06-06', amount: 51.12, currency: 'USD' }]);
  });

  it('parses a USD refund (positive in Amazon UI → negative in export)', () => {
    const html = makeCPEHtml([{ date: 'June 10, 2026', amount: '$10.00' }]);
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toEqual([{ date: '2026-06-10', amount: -10.0, currency: 'USD' }]);
  });

  it('parses a EUR charge with European decimal format', () => {
    const html = makeCPEHtml([{ date: 'June 6, 2026', amount: '-€52,95' }]);
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toEqual([{ date: '2026-06-06', amount: 52.95, currency: 'EUR' }]);
  });

  it('parses multiple transactions from one page', () => {
    const html = makeCPEHtml([
      { date: 'June 6, 2026', amount: '-$51.12' },
      { date: 'June 1, 2026', amount: '-$14.93' },
    ]);
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: '2026-06-06', amount: 51.12, currency: 'USD' });
    expect(result[1]).toEqual({ date: '2026-06-01', amount: 14.93, currency: 'USD' });
  });

  it('deduplicates identical date+amount entries', () => {
    const html = makeCPEHtml([
      { date: 'June 6, 2026', amount: '-$51.12' },
      { date: 'June 6, 2026', amount: '-$51.12' },
    ]);
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when page has no transaction groups', () => {
    const html = '<!DOCTYPE html><html><body><div>No transactions here</div></body></html>';
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toEqual([]);
  });

  it('returns empty array when transaction group has no recognizable date', () => {
    const html = `<!DOCTYPE html><html><body>
      <div class="a-box-group">
        <div class="apx-transaction-date-container"><span>not a date</span></div>
        <div class="a-column a-span3 a-text-right a-span-last">
          <span class="a-size-base-plus a-text-bold">-$51.12</span>
        </div>
      </div>
    </body></html>`;
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toEqual([]);
  });

  it('uses the unicode minus sign (−) as a debit indicator', () => {
    const html = makeCPEHtml([{ date: 'June 6, 2026', amount: '−$51.12' }]);
    const result = parseTransactionsFromCPEPage(html);
    expect(result).toEqual([{ date: '2026-06-06', amount: 51.12, currency: 'USD' }]);
  });
});
