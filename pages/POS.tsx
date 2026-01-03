
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Smartphone,
  X,
  User as UserIcon,
  CheckCircle,
  // Added missing icon imports
  Package,
  ShoppingCart,
  Printer
} from 'lucide-react';
import { AppState, Product, Sale, SaleItem, Customer } from '../types';
import { CURRENCY_SYMBOL, TAX_RATE } from '../constants';
import { generateReceiptPDF } from '../services/pdfService';

const POS = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'EFT'>('CASH');
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [state.products, search]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("Out of stock!");
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price
      }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal; // Assuming VAT is included in shelf price (common in SA)
    return { subtotal, tax, total };
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const newSale: Sale = {
      id: `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      items: [...cart],
      totalAmount: cartTotals.total,
      taxAmount: cartTotals.tax,
      paymentMethod,
      cashierId: state.currentUser?.id || 'unknown',
      customerId: selectedCustomer?.id,
      currency: CURRENCY_SYMBOL
    };

    // Update state
    setState(prev => {
      // Deduct stock
      const updatedProducts = prev.products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.quantity };
        }
        return p;
      });

      // Update customer spent
      const updatedCustomers = prev.customers.map(c => {
        if (c.id === selectedCustomer?.id) {
          return { ...c, totalSpent: c.totalSpent + newSale.totalAmount };
        }
        return c;
      });

      return {
        ...prev,
        sales: [...prev.sales, newSale],
        products: updatedProducts,
        customers: updatedCustomers
      };
    });

    setLastSale(newSale);
    setShowCheckoutSuccess(true);
    setCart([]);
    setSelectedCustomer(null);
  };

  const printReceipt = () => {
    if (lastSale) {
      generateReceiptPDF(lastSale, lastSale.items);
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6">
      {/* Product Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Search products or scan barcode..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              ref={barcodeInputRef}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-500">Scanner Ready</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                className="group bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col"
              >
                <div className="aspect-square bg-gray-50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  <Package className="text-gray-300 group-hover:scale-110 transition-transform" size={40} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-sm line-clamp-2 mb-1">{product.name}</h4>
                  <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="font-bold text-blue-600">{CURRENCY_SYMBOL}{product.price.toFixed(2)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock} left
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="w-full lg:w-96 flex flex-col">
        <div className="bg-white flex-1 rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Current Order</h3>
            <button 
              onClick={() => setCart([])}
              className="text-xs text-red-500 hover:underline font-medium"
            >
              Clear Cart
            </button>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">{CURRENCY_SYMBOL}{item.unitPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-gray-100 rounded text-gray-500">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="text-sm font-bold text-gray-900 w-16 text-right">
                  {CURRENCY_SYMBOL}{item.totalPrice.toFixed(2)}
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-20">
                <ShoppingCart className="opacity-20" size={48} />
                <p className="text-sm">No items in cart</p>
              </div>
            )}
          </div>

          {/* Customer & Totals */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 appearance-none"
                onChange={(e) => {
                  const cust = state.customers.find(c => c.id === e.target.value);
                  setSelectedCustomer(cust || null);
                }}
                value={selectedCustomer?.id || ""}
              >
                <option value="">Walk-in Customer</option>
                {state.customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>VAT (15% included)</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center space-y-1 transition-colors ${paymentMethod === 'CASH' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500'}`}
              >
                <Banknote size={18} />
                <span className="text-[10px] font-bold">CASH</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('CARD')}
                className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center space-y-1 transition-colors ${paymentMethod === 'CARD' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500'}`}
              >
                <CreditCard size={18} />
                <span className="text-[10px] font-bold">CARD</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('EFT')}
                className={`p-2 rounded-lg border text-center flex flex-col items-center justify-center space-y-1 transition-colors ${paymentMethod === 'EFT' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 bg-white text-gray-500'}`}
              >
                <Smartphone size={18} />
                <span className="text-[10px] font-bold">EFT</span>
              </button>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle size={20} />
              <span>Process Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Sale Completed!</h3>
            <p className="text-gray-500 text-sm mb-6">Change due: {CURRENCY_SYMBOL}0.00</p>
            
            <div className="space-y-3">
              <button 
                onClick={printReceipt}
                className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 rounded-lg font-bold"
              >
                <Printer size={18} />
                <span>Print Receipt (PDF)</span>
              </button>
              <button 
                onClick={() => setShowCheckoutSuccess(false)}
                className="w-full text-gray-500 font-medium py-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
