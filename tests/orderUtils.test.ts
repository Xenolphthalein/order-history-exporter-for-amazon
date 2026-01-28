import { describe, it, expect } from 'vitest';
import {
  isAdvertisementOrder,
  extractOrderId,
  extractOrderIdFromUrl,
} from '../src/utils/orderUtils';
import type { Order, OrderItem } from '../src/types';

const createMockOrder = (overrides: Partial<Order> = {}): Order => ({
  orderId: '123-4567890-1234567',
  orderDate: '2024-01-15',
  totalAmount: 99.99,
  currency: 'EUR',
  items: [],
  orderStatus: 'Delivered',
  detailsUrl: 'https://amazon.de/order-details/123',
  promotions: [],
  totalSavings: 0,
  ...overrides,
});

const createMockItem = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  title: 'Test Product',
  asin: 'B0123456789',
  quantity: 1,
  price: 29.99,
  discount: 0,
  itemUrl: 'https://amazon.de/dp/B0123456789',
  ...overrides,
});

describe('isAdvertisementOrder', () => {
  it('should return false for valid order with date', () => {
    const order = createMockOrder();
    expect(isAdvertisementOrder(order)).toBe(false);
  });

  it('should return true for order with Amazon Visa ad pattern and no date', () => {
    const order = createMockOrder({
      orderDate: '',
      items: [createMockItem({ title: 'Amazon Visa Card' })],
    });
    expect(isAdvertisementOrder(order)).toBe(true);
  });

  it('should return true for order with Kreditkarte ad pattern and no date', () => {
    const order = createMockOrder({
      orderDate: '',
      items: [createMockItem({ title: 'Unsere Kreditkarte für Sie' })],
    });
    expect(isAdvertisementOrder(order)).toBe(true);
  });

  it('should return true for order with Barclays Finanzierung and no date', () => {
    const order = createMockOrder({
      orderDate: '',
      items: [createMockItem({ title: 'Barclays Finanzierung Option' })],
    });
    expect(isAdvertisementOrder(order)).toBe(true);
  });

  it('should return true for order with many zero-price items, no date, no status, no URL', () => {
    const items = Array(6).fill(null).map((_, i) => 
      createMockItem({ title: `Product ${i}`, price: 0 })
    );
    const order = createMockOrder({
      orderDate: '',
      orderStatus: '',
      detailsUrl: '',
      items,
    });
    expect(isAdvertisementOrder(order)).toBe(true);
  });

  it('should return false for order with zero-price items but has date', () => {
    const items = Array(6).fill(null).map((_, i) => 
      createMockItem({ title: `Product ${i}`, price: 0 })
    );
    const order = createMockOrder({
      orderDate: '2024-01-15',
      items,
    });
    expect(isAdvertisementOrder(order)).toBe(false);
  });

  it('should return false for order without date but with valid status', () => {
    const order = createMockOrder({
      orderDate: '',
      orderStatus: 'Delivered',
      items: [createMockItem({ price: 0 })],
    });
    expect(isAdvertisementOrder(order)).toBe(false);
  });
});

describe('extractOrderId', () => {
  it('should extract order ID from text', () => {
    expect(extractOrderId('Order #123-4567890-1234567')).toBe('123-4567890-1234567');
  });

  it('should extract order ID from mixed text', () => {
    expect(extractOrderId('Your order 123-4567890-1234567 has shipped')).toBe('123-4567890-1234567');
  });

  it('should return null when no order ID present', () => {
    expect(extractOrderId('No order here')).toBeNull();
  });

  it('should return null for partial order ID format', () => {
    expect(extractOrderId('Order #123-456')).toBeNull();
  });

  it('should extract first order ID if multiple present', () => {
    expect(extractOrderId('Orders: 123-4567890-1234567 and 987-6543210-9876543')).toBe('123-4567890-1234567');
  });
});

describe('extractOrderIdFromUrl', () => {
  it('should extract from orderID parameter (lowercase D)', () => {
    expect(extractOrderIdFromUrl('https://amazon.de/order-details?orderId=123-4567890-1234567')).toBe('123-4567890-1234567');
  });

  it('should extract from orderID parameter (uppercase D)', () => {
    expect(extractOrderIdFromUrl('https://amazon.de/order-details?orderID=123-4567890-1234567')).toBe('123-4567890-1234567');
  });

  it('should return null when no order ID in URL', () => {
    expect(extractOrderIdFromUrl('https://amazon.de/your-orders')).toBeNull();
  });
});
