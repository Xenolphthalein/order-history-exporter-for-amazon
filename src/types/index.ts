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

export interface Transaction {
  date: string;
  amount: number;
  currency: string;
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
  transactions?: Transaction[];
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
  includeTransactions: boolean;
}

export interface ExportState {
  inProgress: boolean;
  format: 'json' | 'csv';
  startDate: string | null;
  endDate: string | null;
  exportAll: boolean;
  includeTransactions: boolean;
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
