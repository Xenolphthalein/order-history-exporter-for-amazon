/**
 * Invoice URL building, link-classification and download orchestration.
 *
 * DOM traversal for the invoice popover page lives in the content script
 * (see `extractInvoicePdfHrefs` in content.ts). Browser APIs are injected
 * so everything here can be unit-tested without a DOM or extension runtime.
 */

import type { DownloadUrlData } from '../types';

/**
 * Build the URL of the "Invoice" popover that Amazon opens on click.
 * The popover HTML is the only place the real PDF link lives; the
 * order-details page only holds an AJAX trigger URL. We omit
 * `relatedRequestId` (a page-scoped token) since Amazon still serves
 * the popover without it as long as the session cookies are valid.
 */
export function buildInvoicePopoverUrl(origin: string, orderId: string): string {
  return `${origin}/your-orders/invoice/popover?orderId=${encodeURIComponent(
    orderId
  )}&ref_=fed_invoice_ajax`;
}

/**
 * Decide whether an `<a href>` from the invoice popover points at a
 * downloadable PDF. The popover typically lists three links:
 *   1. `/gp/css/summary/print.html?orderID=...` (HTML order summary)
 *   2. `/documents/download/<uuid>/invoice.pdf` (the actual invoice PDF)
 *   3. `/gp/help/contact/...` ("request an invoice" fallback)
 * We keep only the second one, or any other `.pdf`-looking link, since
 * third-party sellers may use different paths.
 */
export function isPdfInvoiceHref(href: string): boolean {
  if (!href) return false;
  const normalized = href.trim().toLowerCase();
  if (normalized.startsWith('javascript:')) return false;
  if (normalized.includes('/gp/help/')) return false;
  if (normalized.includes('/summary/print.html')) return false;
  if (normalized.includes('/summary/print.htm')) return false;
  return /\.pdf(?:$|[?#])/i.test(normalized) || normalized.includes('/documents/download/');
}

/**
 * Build the on-disk filename for a downloaded invoice PDF. The order ID
 * appears verbatim so downstream tools can match files back to orders.
 * When one order yields several invoices (multi-shipment orders), a
 * 1-based index keeps filenames unique.
 *
 * The `subfolder` prefix (e.g. `"amazon-invoices"`) is relative to the
 * browser's Downloads directory and lets the user keep invoices grouped
 * without touching the browser's download settings.
 */
export function buildInvoiceFilename(
  orderId: string,
  index: number,
  total: number,
  subfolder?: string
): string {
  const suffix = total > 1 ? `_${index + 1}` : '';
  const base = `${orderId}${suffix}.pdf`;
  return subfolder ? `${subfolder}/${base}` : base;
}

/** Response shape returned by the background download handlers. */
export interface DownloadResponse {
  success: boolean;
  error?: string;
}

export interface InvoiceDownloadDeps {
  /** Fetch the popover at `popoverUrl` and return its PDF hrefs, or null on failure. */
  fetchPdfHrefs: (popoverUrl: string) => Promise<string[] | null>;
  isStopRequested: () => boolean;
  /** Ask the background to download one invoice. */
  download: (data: DownloadUrlData) => Promise<DownloadResponse | undefined>;
  warn: (...args: unknown[]) => void;
}

/**
 * Download every invoice PDF of one order. Best-effort: failures are
 * reported through `deps.warn` and never thrown, so one bad order doesn't
 * abort the export. Cancellation is checked before and after the popover
 * fetch, and before each download dispatch.
 *
 * @returns number of downloads the background reported as started
 */
export async function downloadInvoicesForOrder(
  orderId: string,
  origin: string,
  subfolder: string,
  deps: InvoiceDownloadDeps
): Promise<number> {
  if (deps.isStopRequested()) return 0;
  const hrefs = await deps.fetchPdfHrefs(buildInvoicePopoverUrl(origin, orderId));
  if (hrefs === null || deps.isStopRequested()) return 0;
  if (hrefs.length === 0) {
    deps.warn(`[Amazon Exporter] No PDF invoice link found in popover for ${orderId}`);
    return 0;
  }

  let started = 0;
  for (let i = 0; i < hrefs.length; i++) {
    if (deps.isStopRequested()) break;
    const href = hrefs[i];
    if (!href) continue;
    const data: DownloadUrlData = {
      url: new URL(href, origin).toString(),
      fileName: buildInvoiceFilename(orderId, i, hrefs.length, subfolder),
    };
    try {
      const response = await deps.download(data);
      if (response?.success) {
        started++;
      } else {
        deps.warn(
          `[Amazon Exporter] Invoice download failed for ${orderId}:`,
          response?.error ?? 'no response from background'
        );
      }
    } catch (error) {
      deps.warn(`[Amazon Exporter] Failed to dispatch invoice download for ${orderId}:`, error);
    }
  }
  return started;
}
