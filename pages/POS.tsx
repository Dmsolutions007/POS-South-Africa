
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
  Building2,
  LayoutGrid,
  List
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
  
  // Mobile specific view state: 'catalog' | 'cart'
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => {
      if (!isProcessingPayment && !showCheckoutSuccess && mobileView === 'catalog') {
        barcodeInputRef.current?.focus();
      }
    };
    focusInput();
    const interval = setInterval(focusInput, 3000);
    return () => clearInterval(interval);
  }, [isProcessingPayment, showCheckoutSuccess, mobileView]);

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

  // Fix: Added updateQuantity function to handle quantity changes in the cart
  const updateQuantity = (productId: string, delta: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;
      
      // Validate stock levels before increasing quantity
      if (newQty > product.stock && delta > 0) {
        alert(`Insufficient stock for ${product.name}. Max available: ${product.stock}`);
        return prev;
      }

      // If quantity is adjusted to 0 or less, remove the item from the cart
      if (newQty <= 0) {
        return prev.filter(item => item.productId !== productId);
      }

      return prev.map(item => 
        item.productId === productId 
          ? { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice }
          : item
      );
    });
  };

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal; 
    return { subtotal, tax, total };
  }, [cart]);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'CASH') finalizeSale();
    else if (paymentMethod === 'CARD') {
      setIsProcessingPayment(true);
      setPaymentStep('PROCESSING');
      setTimeout(() => finalizeSale(), 3000);
    } else if (paymentMethod === 'EFT') {
      setIsProcessingPayment(true);
      setPaymentStep('EFT_INFO');
    }
  };

  const finalizeSale = () => {
    const saleId = `SALE-${Date.now()}`;
    const newSale: Sale = {
      id: saleId, timestamp: Date.now(), items: [...cart],
      totalAmount: cartTotals.total, taxAmount: cartTotals.tax,
      paymentMethod, cashierId: state.currentUser?.id || 'unknown',
      customerId: selectedCustomer?.id, currency: CURRENCY_SYMBOL
    };

    setState(prev => ({
      ...prev,
      sales: [...prev.sales, newSale],
      products: prev.products.map(p => {
        const item = cart.find(i => i.productId === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      }),
      customers: prev.customers.map(c => c.id === selectedCustomer?.id ? { ...c, totalSpent: c.totalSpent + newSale.totalAmount } : c)
    }));

    setLastSale(newSale);
    setShowCheckoutSuccess(true);
    setIsProcessingPayment(false);
    setPaymentStep('IDLE');
    setCart([]);
    setSelectedCustomer(null);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Mobile Switcher (Visible on mobile only) */}
      <div className="flex md:hidden bg-white p-1 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-20">
        <button 
          onClick={() => setMobileView('catalog')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${mobileView === 'catalog' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          <LayoutGrid size={16} />
          Catalog
        </button>
        <button 
          onClick={() => setMobileView('cart')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all relative ${mobileView === 'cart' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
        >
          <ShoppingCart size={16} />
          Cart
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] ring-2 ring-white">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Product Selection */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
          <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 mb-4 md:mb-6 flex items-center space-x-3 md:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="SCAN OR SEARCH..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 text-blue-400 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-xs md:text-sm font-mono tracking-widest placeholder:text-blue-900/50 shadow-inner"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                ref={barcodeInputRef}
              />
            </div>
            <div className="hidden sm:flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Scanner Active</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
              {filteredProducts.map(product => (
                <button 
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col active:scale-[0.98]"
                >
                  <div className="aspect-square bg-slate-50 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    <Package className="text-slate-200 group-hover:scale-110 transition-transform" size={32} />
                    {product.stock <= product.lowStockThreshold && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-[11px] md:text-sm line-clamp-2 leading-tight mb-1">{product.name}</h4>
                    <p className="text-[10px] text-slate-400 mb-2 font-medium">{product.category}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-black text-blue-600 text-xs md:text-sm">{CURRENCY_SYMBOL}{product.price.toFixed(2)}</span>
                    <span className={`text-[8px] md:text-[10px] font-black px-1.5 py-0.5 rounded uppercase ${product.stock > product.lowStockThreshold ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {product.stock} STK
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart & Checkout Panel */}
        <div className={`w-full lg:w-[380px] flex flex-col ${mobileView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
          <div className="bg-white flex-1 md:rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-screen lg:max-h-none">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm uppercase tracking-widest">
                <ShoppingCart size={16} className="text-blue-600" />
                Basket
              </h3>
              <button onClick={() => setCart([])} className="text-[10px] text-red-500 hover:underline font-black uppercase tracking-tighter">Clear All</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center space-x-3 p-2 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight mb-0.5">{item.productName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{CURRENCY_SYMBOL}{item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-1 bg-white rounded-lg p-0.5 shadow-sm border border-slate-100">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-slate-50 rounded text-slate-400"><Minus size={12} /></button>
                    <span className="text-xs font-black w-5 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-slate-50 rounded text-slate-400"><Plus size={12} /></button>
                  </div>
                  <div className="text-xs font-black text-slate-900 w-16 text-right">
                    {CURRENCY_SYMBOL}{item.totalPrice.toFixed(2)}
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2 py-20 opacity-50">
                  <ShoppingCart size={48} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Empty Basket</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4 flex-shrink-0">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm uppercase tracking-tighter"
                  onChange={(e) => setSelectedCustomer(state.customers.find(c => c.id === e.target.value) || null)}
                  value={selectedCustomer?.id || ""}
                >
                  <option value="">Guest Walk-in</option>
                  {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subtotal</span>
                  <span className="text-xs font-bold text-slate-600">{CURRENCY_SYMBOL}{cartTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-900">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] border-b-2 border-blue-500">To Pay</span>
                  <span className="text-2xl font-black">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'CARD', 'EFT'].map((method) => (
                  <button 
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 transition-all ${paymentMethod === method ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                  >
                    {method === 'CASH' && <Banknote size={18} />}
                    {method === 'CARD' && <CreditCard size={18} />}
                    {method === 'EFT' && <Smartphone size={18} />}
                    <span className="text-[8px] font-black uppercase tracking-tighter">{method}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center space-x-2 uppercase tracking-[0.15em] text-xs"
              >
                <span>Process Checkout</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Success Overlay */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[2rem] p-6 md:p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-emerald-500"></div>
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight leading-none">Transaction Done</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Stock updated and payment confirmed.</p>
            
            <div className="space-y-3">
              <button 
                onClick={() => lastSale && generateReceiptPDF(lastSale, lastSale.items)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
              >
                <Printer size={18} />
                Print PDF Receipt
              </button>
              <button 
                onClick={() => setShowCheckoutSuccess(false)}
                className="w-full text-slate-400 font-black py-3 hover:bg-slate-50 rounded-2xl transition-all text-[10px] uppercase tracking-widest"
              >
                Start New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Payment types (Existing logic preserved, styles adjusted for mobile) */}
      {isProcessingPayment && paymentStep === 'PROCESSING' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="mb-6"><Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" /></div>
            <h3 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-tight">Syncing Terminal</h3>
            <p className="text-slate-400 text-[10px] mb-6 font-bold uppercase tracking-widest">Awaiting Card Response...</p>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="text-2xl font-black text-slate-900">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
