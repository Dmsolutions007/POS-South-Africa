
import { AppState, User, UserRole } from './types';
import { CONFIG } from './services/config';

const initialUsers: User[] = [
  { id: '1', username: 'admin', role: UserRole.ADMIN, fullName: 'System Administrator' },
  { id: '2', username: 'cashier', role: UserRole.CASHIER, fullName: 'Default Cashier' },
];

const getInitialData = (): AppState => {
  try {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.MAIN_STATE);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error("Storage Initialization Error:", e);
  }
  
  return {
    currentUser: null,
    products: [
      { id: 'p1', name: 'Fresh Milk 2L', category: 'Dairy', barcode: '6001234567890', price: 34.99, costPrice: 28.00, stock: 50, lowStockThreshold: 10 },
      { id: 'p2', name: 'White Bread', category: 'Bakery', barcode: '6000987654321', price: 18.50, costPrice: 14.00, stock: 30, lowStockThreshold: 5 },
      { id: 'p3', name: 'Super Maize Meal 5kg', category: 'Staples', barcode: '6002345678901', price: 65.00, costPrice: 52.00, stock: 40, lowStockThreshold: 8 },
      { id: 'p4', name: 'Sunflower Oil 2L', category: 'Pantry', barcode: '6003456789012', price: 89.99, costPrice: 72.00, stock: 25, lowStockThreshold: 5 },
      { id: 'p5', name: 'Large Eggs 18s', category: 'Dairy', barcode: '6004567890123', price: 58.00, costPrice: 45.00, stock: 30, lowStockThreshold: 6 },
      { id: 'p6', name: 'Coke Original 2L', category: 'Beverages', barcode: '6005678901234', price: 26.50, costPrice: 19.50, stock: 100, lowStockThreshold: 20 },
    ],
    customers: [],
    sales: [],
    inventoryLogs: [],
    flashTransactions: [],
    flashWalletBalance: 4500.75,
    currency: CONFIG.BUSINESS.CURRENCY,
    queuedReceipts: [],
  };
};

export const loadState = (): AppState => getInitialData();

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MAIN_STATE, JSON.stringify(state));
  } catch (e) {
    console.error("State Persistance Error:", e);
  }
};

export const authenticate = (username: string): User | null => {
  return initialUsers.find(u => u.username === username) || null;
};
