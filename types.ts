
export enum UserRole {
  ADMIN = 'ADMIN',
  CASHIER = 'CASHIER'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  price: number;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
}

// FLASH VAS TYPES
export type FlashProductType = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'VOUCHER';

export interface FlashProduct {
  id: string;
  type: FlashProductType;
  provider: string;
  name: string;
  amount: number;
  description?: string;
}

export interface QueuedReceipt {
  type: 'RETAIL' | 'FLASH';
  id: string;
}

export interface FlashTransaction {
  id: string;
  reference: string;
  type: FlashProductType;
  provider: string;
  amount: number;
  customerPhone: string;
  token?: string; // For Electricity or PIN vouchers
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  timestamp: number;
  cashReceived?: number;
  changeDue?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyaltyPoints: number;
  totalSpent: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Sale {
  id: string;
  timestamp: number;
  items: SaleItem[];
  totalAmount: number;
  taxAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'EFT';
  cashierId: string;
  customerId?: string;
  currency: string;
  cashReceived?: number;
  changeDue?: number;
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number; 
  reason: string;
  timestamp: number;
  userId: string;
}

export interface AppState {
  currentUser: User | null;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  inventoryLogs: InventoryLog[];
  flashTransactions: FlashTransaction[];
  flashWalletBalance: number;
  currency: string;
  queuedReceipts: QueuedReceipt[];
}
