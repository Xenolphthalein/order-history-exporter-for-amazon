/**
 * URL building and Amazon page detection utilities
 */

/**
 * Build URL for a specific year and page of Amazon order history
 */
export function buildOrderPageUrl(baseUrl: string, year: string, startIndex: number = 0): string {
  const params = new URLSearchParams();
  params.set('timeFilter', `year-${year}`);
  if (startIndex > 0) {
    params.set('startIndex', startIndex.toString());
  }
  return `${baseUrl}?${params.toString()}`;
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
];

/**
 * Order history page paths
 */
export const ORDER_PATHS = ['/gp/your-account/order-history', '/your-orders'];

/**
 * Check if a URL is an Amazon order history page
 */
export function isAmazonOrderHistoryPage(url: string): boolean {
  if (!url) return false;
  
  const isAmazonDomain = AMAZON_DOMAINS.some((domain) => url.includes(domain));
  const isOrderPath = ORDER_PATHS.some((path) => url.includes(path));
  
  return isAmazonDomain && isOrderPath;
}

/**
 * Extract base order history URL from current page URL
 */
export function getOrderHistoryBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}/your-orders/orders`;
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
