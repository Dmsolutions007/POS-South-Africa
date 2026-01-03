
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
  Package,
  ShoppingCart,
  Printer,
  ChevronRight,
  Loader2,
  Copy,
  Building2
} from 'lucide-react';
import { AppState, Product, Sale, SaleItem, Customer } from '../types';
import { CURRENCY_SYMBOL, TAX_RATE, APP_NAME } from '../constants';
import { generateReceiptPDF } from '../services/pdfService';

const POS = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'EFT'>('CASH');
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'IDLE' | 'PROCESSING' | 'EFT_INFO'>('IDLE');
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Keep scanner focused
  useEffect(() => {
    const focusInput = () => {
      if (!isProcessingPayment && !showCheckoutSuccess) {
        barcodeInputRef.current?.focus();
      }
    };
    focusInput();
    const interval = setInterval(focusInput, 2000);
    return () => clearInterval(interval);
  }, [isProcessingPayment, showCheckoutSuccess]);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [state.products, search]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`"${product.name}" is out of stock!`);
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    // Exact barcode match auto-adds and clears
    const matchedProduct = state.products.find(p => p.barcode === value);
    if (matchedProduct) {
      addToCart(matchedProduct);
      setSearch(""); 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && search.trim() !== "") {
      const matchedProduct = state.products.find(p => p.barcode === search.trim());
      if (matchedProduct) {
        addToCart(matchedProduct);
        setSearch("");
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearch("");
      }
    }
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
    const total = subtotal; 
    return { subtotal, tax, total };
  }, [cart]);

  const finalizeSale = () => {
    const saleId = `SALE-${Date.now()}`;
    const newSale: Sale = {
      id: saleId,
      timestamp: Date.now(),
      items: [...cart],
      totalAmount: cartTotals.total,
      taxAmount: cartTotals.tax,
      paymentMethod,
      cashierId: state.currentUser?.id || 'unknown',
      customerId: selectedCustomer?.id,
      currency: CURRENCY_SYMBOL
    };

    setState(prev => {
      const updatedProducts = prev.products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
        return p;
      });

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
    setIsProcessingPayment(false);
    setPaymentStep('IDLE');
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'CASH') {
      finalizeSale();
    } else if (paymentMethod === 'CARD') {
      setIsProcessingPayment(true);
      setPaymentStep('PROCESSING');
      // Simulate card terminal communication
      setTimeout(() => {
        finalizeSale();
      }, 3000);
    } else if (paymentMethod === 'EFT') {
      setIsProcessingPayment(true);
      setPaymentStep('EFT_INFO');
    }
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
              placeholder="SCAN BARCODE HERE..."
              className="w-full pl-10 pr-4 py-3 bg-slate-900 text-blue-400 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest placeholder:text-blue-900 shadow-inner"
              value={search}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              ref={barcodeInputRef}
              autoFocus
            />
          </div>
          <div className="hidden sm:flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Scanner Ready</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
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
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${product.stock > product.lowStockThreshold ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {product.stock} in stock
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
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={18} className="text-blue-600" />
              Order Details
            </h3>
            <button 
              onClick={() => setCart([])}
              className="text-xs text-red-500 hover:underline font-medium"
            >
              Reset
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.map(item => (
              <div key={item.productId} className="flex items-center space-x-3 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500">{CURRENCY_SYMBOL}{item.unitPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-500">
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-white hover:shadow-sm rounded text-gray-500">
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
                <ShoppingCart className="opacity-10" size={64} />
                <p className="text-sm font-medium">Ready for input</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select 
                className="w-full pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm"
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

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Items Subtotal</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Due</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center space-y-1 transition-all ${paymentMethod === 'CASH' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm ring-2 ring-blue-500/20' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
              >
                <Banknote size={20} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Cash</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('CARD')}
                className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center space-y-1 transition-all ${paymentMethod === 'CARD' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm ring-2 ring-blue-500/20' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
              >
                <CreditCard size={20} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Card</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('EFT')}
                className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center space-y-1 transition-all ${paymentMethod === 'EFT' ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm ring-2 ring-blue-500/20' : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'}`}
              >
                <Smartphone size={20} />
                <span className="text-[10px] font-bold uppercase tracking-widest">EFT</span>
              </button>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 uppercase tracking-widest text-sm"
            >
              <span>{paymentMethod === 'CASH' ? 'Record Sale' : `Pay ${CURRENCY_SYMBOL}${cartTotals.total.toFixed(2)}`}</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Processing Modal (Card) */}
      {isProcessingPayment && paymentStep === 'PROCESSING' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="mb-6">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Communicating with Terminal...</h3>
            <p className="text-slate-500 text-sm mb-4 italic">Please Tap, Swipe or Insert Card</p>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Transaction Amount</p>
              <p className="text-2xl font-black text-slate-900">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</p>
            </div>
            <p className="text-xs text-slate-400">Merchant: {APP_NAME}</p>
          </div>
        </div>
      )}

      {/* EFT Instructions Modal */}
      {isProcessingPayment && paymentStep === 'EFT_INFO' && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">EFT Payment Details</h3>
              <button onClick={() => setIsProcessingPayment(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                <Building2 className="text-blue-600" size={24} />
                <div>
                  <p className="text-xs font-bold text-blue-900 uppercase">Mzansi-Edge Retail Bank</p>
                  <p className="text-sm font-medium text-blue-700">Account: 1029384756</p>
                  <p className="text-sm font-medium text-blue-700">Branch: 250655</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Required Reference</p>
                <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg">
                  <span className="font-mono font-bold text-slate-900">REF-{Date.now().toString().slice(-8)}</span>
                  <button className="text-blue-600"><Copy size={16} /></button>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Amount to Pay:</span>
                <span className="text-xl font-black text-slate-900">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={finalizeSale}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-600/20 uppercase tracking-widest text-sm"
              >
                I've Completed the EFT
              </button>
              <button 
                onClick={() => setIsProcessingPayment(false)}
                className="w-full text-slate-500 font-bold py-2 text-xs uppercase"
              >
                Change Payment Method
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Sale Success</h3>
            <p className="text-slate-500 text-sm mb-8">Transaction completed successfully. System stock updated.</p>
            
            <div className="space-y-3">
              <button 
                onClick={printReceipt}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-lg"
              >
                <Printer size={20} />
                <span>Print Receipt</span>
              </button>
              <button 
                onClick={() => setShowCheckoutSuccess(false)}
                className="w-full text-slate-500 font-bold py-3 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Next Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
