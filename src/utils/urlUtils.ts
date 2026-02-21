/**
 * URL building and Amazon page detection utilities
 */

const AMAZON_LOCALE_PREFIX = /^\/-\/[a-z]{2}(?:[-_][a-z]{2})?(?=\/)/i;

/**
 * Build URL for a specific year and page of Amazon order history
 */
export function buildOrderPageUrl(baseUrl: string, year: string, startIndex: number = 0): string {
  try {
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set('timeFilter', `year-${year}`);
    if (startIndex > 0) {
      urlObj.searchParams.set('startIndex', startIndex.toString());
    } else {
      urlObj.searchParams.delete('startIndex');
    }
    return urlObj.toString();
  } catch {
    const params = new URLSearchParams();
    params.set('timeFilter', `year-${year}`);
    if (startIndex > 0) {
      params.set('startIndex', startIndex.toString());
    }
    return `${baseUrl}?${params.toString()}`;
  }
}

/**
 * List of supported Amazon domains
 */
export const AMAZON_DOMAINS = [
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.ca',
  'amazon.co.jp',
  'amazon.in',
  'amazon.com.au',
  'amazon.com.br',
  'amazon.com.mx',
  'amazon.com.be',
];

/**
 * Order history page paths
 */
export const ORDER_PATHS = [
  '/gp/your-account/order-history',
  '/gp/css/order-history',
  '/your-orders/orders',
  '/your-orders',
];

function isAmazonDomainHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return AMAZON_DOMAINS.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`)
  );
}

function getAmazonLocalePrefix(pathname: string): string {
  return pathname.match(AMAZON_LOCALE_PREFIX)?.[0] || '';
}

function normalizeAmazonPath(pathname: string): string {
  const localePrefix = getAmazonLocalePrefix(pathname);
  return localePrefix ? pathname.slice(localePrefix.length) || '/' : pathname;
}

function getMatchedOrderPath(pathname: string): string | null {
  const normalizedPath = normalizeAmazonPath(pathname);
  const matchedPath = [...ORDER_PATHS]
    .sort((a, b) => b.length - a.length)
    .find((path) => normalizedPath.startsWith(path));
  return matchedPath || null;
}

/**
 * Check if a URL is an Amazon order history page
 */
export function isAmazonOrderHistoryPage(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    return isAmazonDomainHost(urlObj.hostname) && getMatchedOrderPath(urlObj.pathname) !== null;
  } catch {
    return false;
  }
}

/**
 * Extract base order history URL from current page URL
 */
export function getOrderHistoryBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const localePrefix = getAmazonLocalePrefix(urlObj.pathname);
    const matchedPath = getMatchedOrderPath(urlObj.pathname);

    if (matchedPath) {
      const preferredPath = matchedPath === '/your-orders' ? '/your-orders/orders' : matchedPath;
      return `${urlObj.origin}${localePrefix}${preferredPath}`;
    }

    return `${urlObj.origin}${localePrefix}/your-orders/orders`;
  } catch {
    return '';
  }
}

/**
 * Extract ASIN from a product URL
 */
export function extractAsinFromUrl(url: string): string | null {
  const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$|\?)?/i);
  return asinMatch?.[1]?.toUpperCase() || null;
}
