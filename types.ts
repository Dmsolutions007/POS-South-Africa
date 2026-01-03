
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
}

export interface InventoryLog {
  id: string;
  productId: string;
  change: number; // positive for addition, negative for deduction
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
  currency: string;
}
