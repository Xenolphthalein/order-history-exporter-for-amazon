import { describe, it, expect } from 'vitest';
import {
  buildOrderPageUrl,
  isAmazonOrderHistoryPage,
  getOrderHistoryBaseUrl,
  extractAsinFromUrl,
  AMAZON_DOMAINS,
  ORDER_PATHS,
} from '../src/utils/urlUtils';

describe('buildOrderPageUrl', () => {
  const baseUrl = 'https://www.amazon.de/your-orders/orders';

  it('should build URL for year without startIndex', () => {
    const url = buildOrderPageUrl(baseUrl, '2024');
    expect(url).toBe('https://www.amazon.de/your-orders/orders?timeFilter=year-2024');
  });

  it('should build URL with startIndex when provided', () => {
    const url = buildOrderPageUrl(baseUrl, '2024', 10);
    expect(url).toBe('https://www.amazon.de/your-orders/orders?timeFilter=year-2024&startIndex=10');
  });

  it('should not include startIndex when 0', () => {
    const url = buildOrderPageUrl(baseUrl, '2024', 0);
    expect(url).toBe('https://www.amazon.de/your-orders/orders?timeFilter=year-2024');
  });

  it('should handle different years', () => {
    expect(buildOrderPageUrl(baseUrl, '2020')).toContain('year-2020');
    expect(buildOrderPageUrl(baseUrl, '2025')).toContain('year-2025');
  });
});

describe('isAmazonOrderHistoryPage', () => {
  describe('valid Amazon order pages', () => {
    it('should return true for amazon.com order history', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.com/gp/your-account/order-history')).toBe(
        true
      );
    });

    it('should return true for amazon.de your-orders', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.de/your-orders/orders')).toBe(true);
    });

    it('should return true for amazon.co.uk order history', () => {
      expect(
        isAmazonOrderHistoryPage('https://www.amazon.co.uk/your-orders?timeFilter=year-2024')
      ).toBe(true);
    });

    it('should return true for amazon.fr order history', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.fr/gp/your-account/order-history')).toBe(
        true
      );
    });

    it('should return true for amazon.co.jp order history', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.co.jp/your-orders')).toBe(true);
    });

    it('should return true for amazon.com.be order history', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.com.be/your-orders/orders')).toBe(true);
    });

    it('should return true for amazon.de css order history', () => {
      expect(
        isAmazonOrderHistoryPage(
          'https://www.amazon.de/gp/css/order-history?ref_=nav_AccountFlyout_orders'
        )
      ).toBe(true);
    });

    it('should return true for amazon.de your-account order history', () => {
      expect(
        isAmazonOrderHistoryPage(
          'https://www.amazon.de/gp/your-account/order-history?ref_=ya_d_c_yo'
        )
      ).toBe(true);
    });

    it('should return true for locale-prefixed order history URLs', () => {
      expect(
        isAmazonOrderHistoryPage(
          'https://www.amazon.com/-/de/gp/css/order-history?ref_=nav_AccountFlyout_orders'
        )
      ).toBe(true);
    });
  });

  describe('invalid pages', () => {
    it('should return false for Amazon homepage', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.com/')).toBe(false);
    });

    it('should return false for Amazon product page', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.com/dp/B0123456789')).toBe(false);
    });

    it('should return false for non-order history account pages', () => {
      expect(isAmazonOrderHistoryPage('https://www.amazon.de/gp/css/homepage.html')).toBe(false);
    });

    it('should return false for non-Amazon site', () => {
      expect(isAmazonOrderHistoryPage('https://www.ebay.com/your-orders')).toBe(false);
    });

    it('should return false for empty URL', () => {
      expect(isAmazonOrderHistoryPage('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAmazonOrderHistoryPage(null as unknown as string)).toBe(false);
      expect(isAmazonOrderHistoryPage(undefined as unknown as string)).toBe(false);
    });
  });
});

describe('getOrderHistoryBaseUrl', () => {
  it('should extract base URL from full order page URL', () => {
    const url = 'https://www.amazon.de/your-orders/orders?timeFilter=year-2024';
    expect(getOrderHistoryBaseUrl(url)).toBe('https://www.amazon.de/your-orders/orders');
  });

  it('should work with different Amazon domains', () => {
    expect(getOrderHistoryBaseUrl('https://www.amazon.com/some-path')).toBe(
      'https://www.amazon.com/your-orders/orders'
    );
    expect(getOrderHistoryBaseUrl('https://www.amazon.co.uk/some-path')).toBe(
      'https://www.amazon.co.uk/your-orders/orders'
    );
  });

  it('should preserve gp/css/order-history base path', () => {
    expect(
      getOrderHistoryBaseUrl(
        'https://www.amazon.de/gp/css/order-history?ref_=nav_AccountFlyout_orders'
      )
    ).toBe('https://www.amazon.de/gp/css/order-history');
  });

  it('should preserve locale-prefixed base path', () => {
    expect(
      getOrderHistoryBaseUrl(
        'https://www.amazon.com/-/de/gp/css/order-history?ref_=nav_AccountFlyout_orders'
      )
    ).toBe('https://www.amazon.com/-/de/gp/css/order-history');
  });

  it('should return empty string for invalid URL', () => {
    expect(getOrderHistoryBaseUrl('not-a-url')).toBe('');
  });
});

describe('extractAsinFromUrl', () => {
  it('should extract ASIN from /dp/ URL', () => {
    expect(extractAsinFromUrl('https://www.amazon.de/dp/B08N5WRWNW')).toBe('B08N5WRWNW');
  });

  it('should extract ASIN from /gp/product/ URL', () => {
    expect(extractAsinFromUrl('https://www.amazon.de/gp/product/B08N5WRWNW')).toBe('B08N5WRWNW');
  });

  it('should handle lowercase ASIN and convert to uppercase', () => {
    expect(extractAsinFromUrl('https://www.amazon.de/dp/b08n5wrwnw')).toBe('B08N5WRWNW');
  });

  it('should extract ASIN from URL with additional path components', () => {
    expect(extractAsinFromUrl('https://www.amazon.de/Product-Name/dp/B08N5WRWNW/ref=sr_1_1')).toBe(
      'B08N5WRWNW'
    );
  });

  it('should return null for non-product URLs', () => {
    expect(extractAsinFromUrl('https://www.amazon.de/your-orders')).toBeNull();
  });

  it('should return null for invalid ASIN format', () => {
    expect(extractAsinFromUrl('https://www.amazon.de/dp/B123')).toBeNull();
  });
});

describe('constants', () => {
  it('should have supported Amazon domains', () => {
    expect(AMAZON_DOMAINS).toContain('amazon.com');
    expect(AMAZON_DOMAINS).toContain('amazon.de');
    expect(AMAZON_DOMAINS).toContain('amazon.co.uk');
    expect(AMAZON_DOMAINS).toContain('amazon.com.be');
    expect(AMAZON_DOMAINS.length).toBeGreaterThan(5);
  });

  it('should have order paths', () => {
    expect(ORDER_PATHS).toContain('/your-orders');
    expect(ORDER_PATHS).toContain('/gp/your-account/order-history');
    expect(ORDER_PATHS).toContain('/gp/css/order-history');
    expect(ORDER_PATHS).toContain('/your-orders/orders');
  });
});
