
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
  List,
  Zap,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  LockKeyhole
} from 'lucide-react';
import { AppState, Product, Sale, SaleItem, Customer, FlashProductType, FlashTransaction } from '../types';
import { CURRENCY_SYMBOL, TAX_RATE, FLASH_PROVIDERS } from '../constants';
import { generateReceiptPDF, generateFlashReceipt } from '../services/pdfService';
import { FlashService } from '../services/flashService';

const POS = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  // --- Core POS State ---
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'EFT'>('CASH');
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'IDLE' | 'PROCESSING' | 'EFT_INFO'>('IDLE');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  
  // --- Admin PIN Logic ---
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Mobile specific view state: 'catalog' | 'cart'
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');
  // Catalog tab: 'retail' | 'vas'
  const [catalogTab, setCatalogTab] = useState<'retail' | 'vas'>('retail');

  // --- Flash/VAS State ---
  const [vasTab, setVasTab] = useState<FlashProductType>('AIRTIME');
  const [selectedProvider, setSelectedProvider] = useState(FLASH_PROVIDERS[0].name);
  const [vasAmount, setVasAmount] = useState("");
  const [vasPhone, setVasPhone] = useState("");
  const [isVasProcessing, setIsVasProcessing] = useState(false);
  const [lastVasTx, setLastVasTx] = useState<FlashTransaction | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusInput = () => {
      if (!isProcessingPayment && !showCheckoutSuccess && !isAdminModalOpen && mobileView === 'catalog' && catalogTab === 'retail') {
        barcodeInputRef.current?.focus();
      }
    };
    focusInput();
    const interval = setInterval(focusInput, 3000);
    return () => clearInterval(interval);
  }, [isProcessingPayment, showCheckoutSuccess, isAdminModalOpen, mobileView, catalogTab]);

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

  const updateQuantity = (productId: string, delta: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;
      
      if (newQty > product.stock && delta > 0) {
        alert(`Insufficient stock for ${product.name}. Max available: ${product.stock}`);
        return prev;
      }

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

  // Trigger PIN validation before checkout
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setPinError(null);
    setAdminPin("");
    setIsAdminModalOpen(true);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "1953") {
      setIsAdminModalOpen(false);
      proceedToFinalPayment();
    } else {
      setPinError("(you are not allowed to complete the sale; contact the admin on WhatsApp: +27658456336)");
    }
  };

  const proceedToFinalPayment = () => {
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

  // --- Flash Handlers (Also guarded by Admin PIN for consistency) ---
  const [vasSaleData, setVasSaleData] = useState<any>(null);

  const handleFlashSaleRequest = () => {
    if (!vasPhone || !vasAmount || parseFloat(vasAmount) <= 0) return;
    setVasSaleData({ type: vasTab, provider: selectedProvider, amount: parseFloat(vasAmount), phone: vasPhone });
    setPinError(null);
    setAdminPin("");
    setIsAdminModalOpen(true);
  };

  const handleFlashSale = async () => {
    if (!vasSaleData) return;
    setIsVasProcessing(true);
    const { type, provider, amount, phone } = vasSaleData;
    const result = await FlashService.processSale(type, provider, amount, phone);
    
    if (result.success) {
      const newTx: FlashTransaction = {
        id: `TX-${Date.now()}`,
        reference: result.ref,
        type: type as FlashProductType,
        provider: provider,
        amount: amount,
        customerPhone: phone,
        token: result.token,
        status: 'SUCCESS',
        timestamp: Date.now()
      };

      setState((prev: any) => ({
        ...prev,
        flashTransactions: [...prev.flashTransactions, newTx],
        flashWalletBalance: prev.flashWalletBalance - amount
      }));
      setLastVasTx(newTx);
      setVasAmount("");
      setVasPhone("");
      setVasSaleData(null);
    } else {
      alert(result.error);
    }
    setIsVasProcessing(false);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Top Navigation Switcher for Desktop & Mobile Header Overlay */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-30">
        <button 
          onClick={() => { setCatalogTab('retail'); setMobileView('catalog'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${catalogTab === 'retail' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <LayoutGrid size={16} />
          Retail Goods
        </button>
        <button 
          onClick={() => { setCatalogTab('vas'); setMobileView('catalog'); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${catalogTab === 'vas' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Zap size={16} />
          Flash / VAS
        </button>
        <button 
          onClick={() => setMobileView('cart')}
          className={`md:hidden flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all relative ${mobileView === 'cart' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}
        >
          <ShoppingCart size={16} />
          Basket ({cart.length})
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Main Selection Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
          {catalogTab === 'retail' ? (
            <div className="flex-1 flex flex-col">
              {/* Search Header */}
              <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex items-center space-x-3 md:space-x-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="SCAN BARCODE OR SEARCH ITEMS..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 text-blue-400 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-xs font-mono tracking-widest placeholder:text-blue-900/50 shadow-inner"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    ref={barcodeInputRef}
                  />
                </div>
                <div className="hidden sm:flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Live Scan</span>
                </div>
              </div>

              {/* Product Grid */}
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
                        <h4 className="font-bold text-slate-800 text-[11px] md:text-xs line-clamp-2 leading-tight mb-1">{product.name}</h4>
                        <p className="text-[9px] text-slate-400 font-medium uppercase">{product.category}</p>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-black text-blue-600 text-xs">{CURRENCY_SYMBOL}{product.price.toFixed(2)}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${product.stock > product.lowStockThreshold ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {product.stock}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Flash / VAS Interface */
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="bg-indigo-600 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={20} fill="white" />
                    <h3 className="text-lg font-black uppercase tracking-widest">Digital Value Services</h3>
                  </div>
                  <p className="text-xs text-indigo-100 font-medium opacity-80">Sell Airtime, Data, and Electricity instantly.</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100 mb-1">Flash Float</p>
                  <p className="text-xl font-black">{CURRENCY_SYMBOL}{state.flashWalletBalance.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                {/* VAS Type Selection */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {(['AIRTIME', 'DATA', 'ELECTRICITY', 'VOUCHER'] as FlashProductType[]).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setVasTab(tab)}
                      className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${vasTab === tab ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Provider Selection */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {FLASH_PROVIDERS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => setSelectedProvider(p.name)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${selectedProvider === p.name ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${p.color} border-2 border-white`}></div>
                      <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedProvider === p.name ? 'text-indigo-600' : 'text-slate-400'}`}>{p.name}</span>
                    </button>
                  ))}
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Recipient Phone</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="tel" 
                        placeholder="082 000 0000"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 shadow-inner"
                        value={vasPhone}
                        onChange={(e) => setVasPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sale Amount</label>
                    <div className="relative">
                       <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-900 text-lg">{CURRENCY_SYMBOL}</span>
                       <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 text-2xl shadow-inner"
                        value={vasAmount}
                        onChange={(e) => setVasAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleFlashSaleRequest}
                  disabled={isVasProcessing || !vasAmount || !vasPhone}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black py-6 rounded-3xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm active:scale-95"
                >
                  {isVasProcessing ? <RefreshCw className="animate-spin" size={24} /> : <span>Confirm Digital Sale</span>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unified Cart Panel */}
        <div className={`w-full lg:w-[400px] flex flex-col ${mobileView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
          <div className="bg-white flex-1 md:rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-[85vh] lg:max-h-none">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
              <h3 className="font-black text-slate-900 flex items-center gap-2 text-xs uppercase tracking-widest">
                <ShoppingCart size={16} className="text-blue-600" />
                Current Basket
              </h3>
              <button onClick={() => setCart([])} className="text-[10px] text-red-500 hover:underline font-black uppercase tracking-widest">Clear</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center space-x-3 p-3 bg-slate-50/50 rounded-xl border border-transparent hover:border-slate-100 transition-colors">
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
                  <p className="text-[10px] font-black uppercase tracking-widest">No Items</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-4 flex-shrink-0">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select 
                  className="w-full pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm uppercase tracking-tighter"
                  onChange={(e) => setSelectedCustomer(state.customers.find(c => c.id === e.target.value) || null)}
                  value={selectedCustomer?.id || ""}
                >
                  <option value="">Guest (Standard)</option>
                  {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center text-slate-900">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Total Due</span>
                  <span className="text-2xl font-black">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['CASH', 'CARD', 'EFT'].map((method) => (
                  <button 
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center space-y-1 transition-all ${paymentMethod === method ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white text-slate-400'}`}
                  >
                    {method === 'CASH' && <Banknote size={18} />}
                    {method === 'CARD' && <CreditCard size={18} />}
                    {method === 'EFT' && <Smartphone size={18} />}
                    <span className="text-[8px] font-black uppercase">{method}</span>
                  </button>
                ))}
              </div>

              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black py-5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-xs"
              >
                <span>Confirm Sale</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Admin PIN Verification Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[250] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-8 pb-4 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <LockKeyhole size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Admin Authorization</h3>
              <p className="text-slate-400 text-xs font-bold uppercase mt-1 tracking-widest">Enter Access PIN to Finalize</p>
            </div>

            <form onSubmit={(e) => {
              if (vasSaleData) {
                e.preventDefault();
                if (adminPin === "1953") {
                  setIsAdminModalOpen(false);
                  handleFlashSale();
                } else {
                  setPinError("(you are not allowed to complete the sale; contact the admin on WhatsApp: +27658456336)");
                }
              } else {
                handleVerifyAdminPin(e);
              }
            }} className="p-8 pt-4 space-y-6">
              <div className="space-y-2">
                <input 
                  type="password" 
                  value={adminPin}
                  maxLength={4}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 text-center text-3xl font-black tracking-[1em] focus:border-blue-500 focus:bg-white transition-all outline-none"
                  placeholder="••••"
                  autoFocus
                  required
                />
                {pinError && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-3">
                      <ShieldAlert size={20} className="shrink-0" />
                      <p className="text-[10px] font-black uppercase leading-relaxed text-left">{pinError}</p>
                    </div>
                    <a 
                      href="https://wa.me/27658456336" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
                    >
                      <Smartphone size={16} />
                      WhatsApp Admin
                    </a>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => { setIsAdminModalOpen(false); setVasSaleData(null); }}
                  className="py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Overlays */}
      {showCheckoutSuccess && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Sale Confirmed</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Stock updated successfully.</p>
            <div className="space-y-3">
              <button onClick={() => lastSale && generateReceiptPDF(lastSale, lastSale.items)} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                <Printer size={18} /> Print Receipt
              </button>
              <button onClick={() => setShowCheckoutSuccess(false)} className="w-full text-slate-400 font-black py-3 hover:bg-slate-50 rounded-2xl transition-all text-[10px] uppercase tracking-widest">New Sale</button>
            </div>
          </div>
        </div>
      )}

      {lastVasTx && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full text-center shadow-2xl">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
              <Zap size={48} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">VAS Confirmed</h3>
            {lastVasTx.token && (
              <div className="bg-slate-950 p-6 rounded-3xl mb-8 border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Token PIN</p>
                <p className="text-xl font-mono font-black text-blue-400 tracking-widest break-all">{lastVasTx.token}</p>
              </div>
            )}
            <div className="space-y-4">
              <button onClick={() => generateFlashReceipt(lastVasTx)} className="w-full flex items-center justify-center space-x-3 bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">
                <Printer size={20} /> <span>Print Voucher</span>
              </button>
              <button onClick={() => setLastVasTx(null)} className="w-full text-slate-400 font-black py-4 hover:bg-slate-50 rounded-2xl text-[10px] uppercase tracking-widest">Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isProcessingPayment && paymentStep === 'PROCESSING' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="mb-6"><Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" /></div>
            <h3 className="text-lg font-black text-slate-900 mb-1 uppercase tracking-tight">Terminal Sync</h3>
            <p className="text-slate-400 text-[10px] mb-6 font-bold uppercase tracking-widest">Awaiting Response...</p>
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
