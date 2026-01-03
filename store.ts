
import { AppState, User, Product, Customer, Sale, InventoryLog, UserRole } from './types';

const STORAGE_KEY = 'nexus_pos_data';

const initialUsers: User[] = [
  { id: '1', username: 'admin', role: UserRole.ADMIN, fullName: 'System Administrator' },
  { id: '2', username: 'cashier', role: UserRole.CASHIER, fullName: 'Default Cashier' },
];

const getInitialData = (): AppState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    currentUser: null,
    products: [
      { id: 'p1', name: 'Fresh Milk 2L', category: 'Dairy', barcode: '6001234567890', price: 34.99, costPrice: 28.00, stock: 50, lowStockThreshold: 10 },
      { id: 'p2', name: 'White Bread', category: 'Bakery', barcode: '6000987654321', price: 18.50, costPrice: 14.00, stock: 30, lowStockThreshold: 5 },
      { id: 'p3', name: 'Coca-Cola 500ml', category: 'Beverages', barcode: '5449000000996', price: 14.00, costPrice: 10.00, stock: 100, lowStockThreshold: 20 },
    ],
    customers: [
      { id: 'c1', name: 'John Doe', email: 'john@example.com', phone: '0821234567', loyaltyPoints: 0, totalSpent: 0 }
    ],
    sales: [],
    inventoryLogs: [],
    currency: 'ZAR',
  };
};

export const loadState = (): AppState => getInitialData();

export const saveState = (state: AppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const authenticate = (username: string): User | null => {
  const user = initialUsers.find(u => u.username === username);
  return user || null;
};
