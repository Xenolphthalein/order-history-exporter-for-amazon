/**
 * Shared types for Order History Exporter for Amazon
 */

export interface OrderItem {
  title: string;
  asin: string;
  quantity: number;
  price: number;
  discount: number;
  itemUrl: string;
}

// Amazon never exposes full card numbers (PCI-DSS). The most we can capture
// is whatever the order details page renders to the logged-in user — typically
// a card brand and the last 4 digits, e.g. "Visa ending in 1234".
export interface PaymentMethod {
  brand: string;
  last4: string;
  raw: string;
}

export interface Order {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  currency: string;
  items: OrderItem[];
  orderStatus: string;
  detailsUrl: string;
  promotions: Promotion[];
  totalSavings: number;
  paymentMethod?: PaymentMethod;
}

export interface Promotion {
  description: string;
  amount: number;
}

export interface ExportOptions {
  format: 'json' | 'csv';
  startDate: string | null;
  endDate: string | null;
  exportAll: boolean;
  includePaymentMethod: boolean;
}

export interface ExportState {
  inProgress: boolean;
  format: 'json' | 'csv';
  startDate: string | null;
  endDate: string | null;
  exportAll: boolean;
  includePaymentMethod: boolean;
  yearsToProcess: string[];
  currentYearIndex: number;
  currentStartIndex: number;
  collectedOrders: Order[];
  seenOrderIds: string[];
  baseUrl: string;
}

export interface DownloadData {
  content: string;
  fileName: string;
  mimeType: string;
}

export interface MessagePayload {
  action: string;
  data?: unknown;
  options?: ExportOptions;
}

export interface ProgressData {
  percent: number;
  message: string;
}
