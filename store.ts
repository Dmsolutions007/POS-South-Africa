
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
    ],
    customers: [],
    sales: [],
    inventoryLogs: [],
    flashTransactions: [],
    flashWalletBalance: 4500.75,
    currency: CONFIG.BUSINESS.CURRENCY,
  };
};

export const loadState = (): AppState => getInitialData();

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MAIN_STATE, JSON.stringify(state));
  } catch (e) {
    console.error("State Persistance Error:", e);
    // In production hosting, we could trigger a cloud backup here if localStorage fails
  }
};

export const authenticate = (username: string): User | null => {
  return initialUsers.find(u => u.username === username) || null;
};
