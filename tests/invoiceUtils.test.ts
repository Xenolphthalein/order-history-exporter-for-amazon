import { describe, it, expect, vi } from 'vitest';
import {
  buildInvoicePopoverUrl,
  isPdfInvoiceHref,
  buildInvoiceFilename,
  downloadInvoicesForOrder,
} from '../src/utils/invoiceUtils';
import type { InvoiceDownloadDeps } from '../src/utils/invoiceUtils';

describe('buildInvoicePopoverUrl', () => {
  it('builds the correct URL for amazon.fr', () => {
    expect(buildInvoicePopoverUrl('https://www.amazon.fr', '407-0100142-8760371')).toBe(
      'https://www.amazon.fr/your-orders/invoice/popover?orderId=407-0100142-8760371&ref_=fed_invoice_ajax'
    );
  });

  it('uses the provided origin verbatim (no locale assumptions)', () => {
    expect(buildInvoicePopoverUrl('https://www.amazon.de', '123-4567890-1234567')).toBe(
      'https://www.amazon.de/your-orders/invoice/popover?orderId=123-4567890-1234567&ref_=fed_invoice_ajax'
    );
  });

  it('URL-encodes the order ID', () => {
    const url = buildInvoicePopoverUrl('https://www.amazon.com', 'x?y&z');
    expect(url).toContain('orderId=x%3Fy%26z');
  });
});

describe('isPdfInvoiceHref', () => {
  it('accepts the /documents/download/<uuid>/invoice.pdf pattern (Amazon direct)', () => {
    expect(
      isPdfInvoiceHref('/documents/download/83f29a5a-8a6b-4e33-912f-faca564f0155/invoice.pdf')
    ).toBe(true);
  });

  it('accepts any .pdf link (third-party sellers)', () => {
    expect(isPdfInvoiceHref('/invoice/Invoice-10311208054609.pdf')).toBe(true);
    expect(isPdfInvoiceHref('/invoice/download?file=invoiceId-2509869886.pdf')).toBe(true);
  });

  it('rejects the printable order summary link', () => {
    expect(isPdfInvoiceHref('/gp/css/summary/print.html?orderID=407-0100142-8760371')).toBe(false);
  });

  it('rejects the "request an invoice" contact link', () => {
    expect(isPdfInvoiceHref('/gp/help/contact/contact.html?orderID=407-0100142-8760371')).toBe(
      false
    );
  });

  it('rejects javascript: pseudo-URLs', () => {
    expect(isPdfInvoiceHref('javascript:void(0)')).toBe(false);
  });

  it('rejects empty strings', () => {
    expect(isPdfInvoiceHref('')).toBe(false);
  });

  it('is case-insensitive on the extension', () => {
    expect(isPdfInvoiceHref('/documents/download/x/INVOICE.PDF')).toBe(true);
  });
});

describe('buildInvoiceFilename', () => {
  it('returns the plain order-id filename when there is only one invoice', () => {
    expect(buildInvoiceFilename('407-0100142-8760371', 0, 1)).toBe('407-0100142-8760371.pdf');
  });

  it('suffixes with a 1-based index when the order has several invoices', () => {
    expect(buildInvoiceFilename('407-0100142-8760371', 0, 3)).toBe('407-0100142-8760371_1.pdf');
    expect(buildInvoiceFilename('407-0100142-8760371', 1, 3)).toBe('407-0100142-8760371_2.pdf');
    expect(buildInvoiceFilename('407-0100142-8760371', 2, 3)).toBe('407-0100142-8760371_3.pdf');
  });

  it('prepends the subfolder when provided', () => {
    expect(buildInvoiceFilename('407-0100142-8760371', 0, 1, 'amazon-invoices')).toBe(
      'amazon-invoices/407-0100142-8760371.pdf'
    );
  });

  it('keeps the subfolder in the multi-invoice case too', () => {
    expect(buildInvoiceFilename('407-0100142-8760371', 1, 2, 'amazon-invoices')).toBe(
      'amazon-invoices/407-0100142-8760371_2.pdf'
    );
  });
});

describe('downloadInvoicesForOrder', () => {
  const origin = 'https://www.amazon.fr';
  const orderId = '407-0100142-8760371';

  function makeDeps(overrides: Partial<InvoiceDownloadDeps> = {}): InvoiceDownloadDeps {
    return {
      fetchPdfHrefs: vi.fn(async () => ['/documents/download/a/invoice.pdf']),
      isStopRequested: vi.fn(() => false),
      download: vi.fn(async () => ({ success: true })),
      warn: vi.fn(),
      ...overrides,
    };
  }

  it('downloads every PDF with absolute URLs and indexed filenames', async () => {
    const deps = makeDeps({
      fetchPdfHrefs: vi.fn(async () => [
        '/documents/download/a/invoice.pdf',
        '/documents/download/b/invoice.pdf',
      ]),
    });
    const started = await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps);
    expect(started).toBe(2);
    expect(deps.fetchPdfHrefs).toHaveBeenCalledWith(buildInvoicePopoverUrl(origin, orderId));
    expect(deps.download).toHaveBeenNthCalledWith(1, {
      url: 'https://www.amazon.fr/documents/download/a/invoice.pdf',
      fileName: `amazon-invoices/${orderId}_1.pdf`,
    });
    expect(deps.download).toHaveBeenNthCalledWith(2, {
      url: 'https://www.amazon.fr/documents/download/b/invoice.pdf',
      fileName: `amazon-invoices/${orderId}_2.pdf`,
    });
  });

  it('does not fetch the popover when stop was already requested', async () => {
    const deps = makeDeps({ isStopRequested: vi.fn(() => true) });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(0);
    expect(deps.fetchPdfHrefs).not.toHaveBeenCalled();
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('queues nothing when stop is requested while the popover fetch is pending', async () => {
    let stopped = false;
    const deps = makeDeps({
      fetchPdfHrefs: vi.fn(async () => {
        stopped = true; // user clicks Stop during the fetch
        return ['/documents/download/a/invoice.pdf', '/documents/download/b/invoice.pdf'];
      }),
      isStopRequested: vi.fn(() => stopped),
    });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(0);
    expect(deps.download).not.toHaveBeenCalled();
  });

  it('stops dispatching remaining PDFs once stop is requested', async () => {
    let stopped = false;
    const deps = makeDeps({
      fetchPdfHrefs: vi.fn(async () => [
        '/documents/download/a/invoice.pdf',
        '/documents/download/b/invoice.pdf',
      ]),
      isStopRequested: vi.fn(() => stopped),
      download: vi.fn(async () => {
        stopped = true;
        return { success: true };
      }),
    });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(1);
    expect(deps.download).toHaveBeenCalledTimes(1);
  });

  it('reports failed download responses and continues with the next PDF', async () => {
    const deps = makeDeps({
      fetchPdfHrefs: vi.fn(async () => [
        '/documents/download/a/invoice.pdf',
        '/documents/download/b/invoice.pdf',
      ]),
      download: vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: 'Download canceled' })
        .mockResolvedValueOnce({ success: true }),
    });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(1);
    expect(deps.download).toHaveBeenCalledTimes(2);
    expect(deps.warn).toHaveBeenCalledWith(expect.stringContaining(orderId), 'Download canceled');
  });

  it('reports a missing background response as a failure', async () => {
    const deps = makeDeps({ download: vi.fn(async () => undefined) });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(0);
    expect(deps.warn).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected message dispatch without throwing', async () => {
    const deps = makeDeps({ download: vi.fn(async () => Promise.reject(new Error('boom'))) });
    await expect(downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).resolves.toBe(
      0
    );
    expect(deps.warn).toHaveBeenCalledTimes(1);
  });

  it('warns when the popover has no PDF link', async () => {
    const deps = makeDeps({ fetchPdfHrefs: vi.fn(async () => []) });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(0);
    expect(deps.warn).toHaveBeenCalledWith(expect.stringContaining('No PDF invoice link'));
  });

  it('skips silently when the popover fetch failed', async () => {
    const deps = makeDeps({ fetchPdfHrefs: vi.fn(async () => null) });
    expect(await downloadInvoicesForOrder(orderId, origin, 'amazon-invoices', deps)).toBe(0);
    expect(deps.download).not.toHaveBeenCalled();
  });
});
