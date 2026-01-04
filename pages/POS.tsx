
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
  LockKeyhole,
  Coins,
  WifiOff,
  Clock
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
  const [cashReceived, setCashReceived] = useState<string>("");
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'IDLE' | 'PROCESSING' | 'EFT_INFO'>('IDLE');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isOfflineSale, setIsOfflineSale] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  
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
  const [vasCashReceived, setVasCashReceived] = useState<string>("");
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
    const total = subtotal + tax; 
    return { subtotal, tax, total };
  }, [cart]);

  const changeDue = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - cartTotals.total);
  }, [cashReceived, cartTotals.total]);

  const vasChangeDue = useMemo(() => {
    const received = parseFloat(vasCashReceived) || 0;
    const amount = parseFloat(vasAmount) || 0;
    return Math.max(0, received - amount);
  }, [vasCashReceived, vasAmount]);

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
      setPinError("(Authorization failed. Contact admin: +27658456336)");
    }
  };

  const proceedToFinalPayment = () => {
    if (paymentMethod === 'CASH') finalizeSale();
    else if (paymentMethod === 'CARD') {
      setIsProcessingPayment(true);
      setPaymentStep('PROCESSING');
      setTimeout(() => finalizeSale(), 2500);
    } else if (paymentMethod === 'EFT') {
      setIsProcessingPayment(true);
      setPaymentStep('EFT_INFO');
    }
  };

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
      currency: CURRENCY_SYMBOL,
      cashReceived: paymentMethod === 'CASH' ? (parseFloat(cashReceived) || cartTotals.total) : undefined,
      changeDue: paymentMethod === 'CASH' ? changeDue : undefined
    };

    const isOffline = !navigator.onLine;
    setIsOfflineSale(isOffline);
    setIsQueued(isOffline);

    setState(prev => ({
      ...prev,
      sales: [...prev.sales, newSale],
      products: prev.products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
        return p;
      }),
      queuedReceipts: isOffline ? [...prev.queuedReceipts, { type: 'RETAIL', id: saleId }] : prev.queuedReceipts
    }));

    setLastSale(newSale);
    setCart([]);
    setCashReceived("");
    setPaymentStep('IDLE');
    setIsProcessingPayment(false);
    setShowCheckoutSuccess(true);
  };

  const handleVasSale = async () => {
    if (!vasPhone || !vasAmount || parseFloat(vasAmount) <= 0) return;
    setIsVasProcessing(true);
    const result = await FlashService.processSale(vasTab, selectedProvider, parseFloat(vasAmount), vasPhone);
    if (result.success) {
      const vAmount = parseFloat(vasAmount);
      const vCash = parseFloat(vasCashReceived) || vAmount;
      const vChange = Math.max(0, vCash - vAmount);
      const isOffline = !navigator.onLine;

      const txId = `TX-${Date.now()}`;
      const newTx: FlashTransaction = {
        id: txId,
        reference: result.ref,
        type: vasTab,
        provider: selectedProvider,
        amount: vAmount,
        customerPhone: vasPhone,
        token: result.token,
        status: 'SUCCESS',
        timestamp: Date.now(),
        cashReceived: vCash,
        changeDue: vChange
      };

      setState(prev => ({
        ...prev,
        flashTransactions: [...prev.flashTransactions, newTx],
        flashWalletBalance: prev.flashWalletBalance - vAmount,
        queuedReceipts: isOffline ? [...prev.queuedReceipts, { type: 'FLASH', id: txId }] : prev.queuedReceipts
      }));
      setLastVasTx(newTx);
      setVasAmount("");
      setVasPhone("");
      setVasCashReceived("");
    } else {
      alert(result.error);
    }
    setIsVasProcessing(false);
  };

  const toggleReceiptQueue = () => {
    if (!lastSale) return;
    const currentlyQueued = state.queuedReceipts.some(q => q.id === lastSale.id);
    if (currentlyQueued) {
       setState(prev => ({
         ...prev,
         queuedReceipts: prev.queuedReceipts.filter(q => q.id !== lastSale.id)
       }));
       setIsQueued(false);
    } else {
      setState(prev => ({
        ...prev,
        queuedReceipts: [...prev.queuedReceipts, { type: 'RETAIL', id: lastSale.id }]
      }));
      setIsQueued(true);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6 min-h-0">
      {/* Catalog / Left Panel */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2 mb-3">
           <button 
             onClick={() => setCatalogTab('retail')}
             className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${catalogTab === 'retail' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 border border-slate-100'}`}
           >
             Retail Items
           </button>
           <button 
             onClick={() => setCatalogTab('vas')}
             className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${catalogTab === 'vas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 border border-slate-100'}`}
           >
             VAS / Flash
           </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-0">
          {catalogTab === 'retail' ? (
            <>
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    ref={barcodeInputRef}
                    type="text" 
                    placeholder="Search catalog..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 touch-pan-y">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="p-3 bg-white rounded-2xl border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col group active:scale-95"
                  >
                    <div className="w-full aspect-square bg-slate-50 rounded-xl mb-2 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                      <Package size={28} />
                    </div>
                    <p className="text-[10px] font-black text-slate-900 leading-tight mb-1 truncate">{p.name}</p>
                    <p className="text-[10px] font-black text-blue-600 mb-2">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${p.stock <= p.lowStockThreshold ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {p.stock} In
                      </span>
                      <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Plus size={14} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col p-4 md:p-6 space-y-6 overflow-y-auto min-h-0 touch-pan-y">
              <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar pb-2 flex-shrink-0">
                {(['AIRTIME', 'DATA', 'ELECTRICITY', 'VOUCHER'] as FlashProductType[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setVasTab(tab)}
                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${vasTab === tab ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    {tab}
                    {vasTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 flex-shrink-0">
                {FLASH_PROVIDERS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedProvider(p.name)}
                    className={`p-2 rounded-xl border transition-all flex flex-col items-center gap-1.5 ${selectedProvider === p.name ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${p.color} border border-white shadow-sm`}></div>
                    <span className={`text-[8px] font-black uppercase tracking-tighter ${selectedProvider === p.name ? 'text-blue-600' : 'text-slate-400'}`}>{p.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Phone</label>
                  <input 
                    type="tel" 
                    placeholder="082 000 0000"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={vasPhone}
                    onChange={(e) => setVasPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-900 text-sm">{CURRENCY_SYMBOL}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-black text-lg"
                      value={vasAmount}
                      onChange={(e) => setVasAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash In</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600 text-sm">{CURRENCY_SYMBOL}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 bg-emerald-50/50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-black text-lg"
                      value={vasCashReceived}
                      onChange={(e) => setVasCashReceived(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {parseFloat(vasCashReceived) > 0 && (
                <div className="bg-slate-900 p-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Change Due</p>
                    <p className="text-lg font-black text-emerald-500">{CURRENCY_SYMBOL}{vasChangeDue.toFixed(2)}</p>
                  </div>
                  <Coins className="text-emerald-500/20" size={24} />
                </div>
              )}

              <button 
                onClick={handleVasSale}
                disabled={isVasProcessing || !vasAmount || !vasPhone || (parseFloat(vasCashReceived) > 0 && parseFloat(vasCashReceived) < parseFloat(vasAmount))}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] active:scale-95 flex-shrink-0"
              >
                {isVasProcessing ? <RefreshCw className="animate-spin" size={16} /> : <span>Complete VAS Transaction</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cart / Right Panel */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col min-h-0 ${mobileView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <ShoppingCart size={14} className="text-blue-600" />
              Active Cart
            </h3>
            <button onClick={() => setCart([])} className="text-[9px] font-black text-red-500 uppercase hover:underline">Clear</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 touch-pan-y">
            {cart.map(item => (
              <div key={item.productId} className="p-2.5 bg-slate-50 rounded-xl flex items-center gap-3 animate-in slide-in-from-right-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-900 truncate leading-none mb-1">{item.productName}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{CURRENCY_SYMBOL}{item.unitPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-1.5 py-0.5 rounded-lg shadow-sm">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-blue-600"><Minus size={12} /></button>
                  <span className="text-[10px] font-black w-3 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-blue-600"><Plus size={12} /></button>
                </div>
                <p className="text-[10px] font-black text-slate-900 w-14 text-right">{CURRENCY_SYMBOL}{item.totalPrice.toFixed(2)}</p>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400 py-10">
                <ShoppingCart size={40} className="mb-3" />
                <p className="text-[9px] font-black uppercase tracking-widest">Register is empty</p>
              </div>
            )}
          </div>

          <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-4 flex-shrink-0">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total Due</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'CARD', 'EFT'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${paymentMethod === method ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-500'}`}
                >
                  {method === 'CASH' ? <Banknote size={14} /> : method === 'CARD' ? <CreditCard size={14} /> : <Smartphone size={14} />}
                  <span className="text-[8px] font-black uppercase">{method}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-2 animate-in slide-in-from-bottom-2">
                <input 
                  type="number"
                  placeholder="Enter Cash Tendered"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-black text-center text-sm"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
                {parseFloat(cashReceived) > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Change:</span>
                    <span className="text-xs font-black text-emerald-600">{CURRENCY_SYMBOL}{changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || (paymentMethod === 'CASH' && (!cashReceived || parseFloat(cashReceived) < cartTotals.total))}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle size={16} />
              <span>Checkout Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Authorization PIN Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <LockKeyhole size={16} className="text-blue-600" />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Supervisor Auth</h3>
               </div>
               <button onClick={() => setIsAdminModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleVerifyAdminPin} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center block">Enter Admin Authorization PIN</label>
                <input 
                  type="password" 
                  autoFocus
                  className="w-full text-center text-3xl font-black py-4 bg-slate-50 border-none rounded-3xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500"
                  placeholder="••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                {pinError && <p className="text-[8px] text-red-500 font-bold text-center leading-tight mt-2">{pinError}</p>}
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95">Verify Terminal PIN</button>
            </form>
          </div>
        </div>
      )}

      {/* Success Receipt Modal */}
      {showCheckoutSuccess && lastSale && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-90 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10 rotate-3">
              <CheckCircle2 size={40} strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-1 uppercase tracking-tighter">Sale Success</h3>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-4">Ref: {lastSale.id}</p>
            
            {isOfflineSale && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-6 flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-lg">
                  <WifiOff size={14} />
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest leading-none mb-0.5">Mirror active</p>
                  <p className="text-[7px] font-bold text-amber-600 uppercase leading-tight">Queued for cloud sync.</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => generateReceiptPDF(lastSale, lastSale.items)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30 active:scale-95"
              >
                <Printer size={18} />
                <span>Print Receipt</span>
              </button>
              
              {!navigator.onLine && (
                <button 
                  onClick={toggleReceiptQueue}
                  className={`w-full py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${isQueued ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  <Clock size={16} />
                  <span>{isQueued ? 'In Queue' : 'Queue Receipt'}</span>
                </button>
              )}

              <button 
                onClick={() => setShowCheckoutSuccess(false)}
                className="w-full text-slate-400 py-3 font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
              >
                Return to Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart / View Toggle Button */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-950 px-5 py-3 rounded-full shadow-2xl z-40 border border-white/10">
        <button 
          onClick={() => setMobileView(mobileView === 'catalog' ? 'cart' : 'catalog')}
          className="flex items-center gap-3"
        >
          <div className="relative">
            <ShoppingCart size={20} className="text-white" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-slate-950">{cart.length}</span>
            )}
          </div>
          <div className="text-left">
            <p className="text-[8px] font-black text-slate-500 uppercase leading-none">Order Total</p>
            <p className="text-xs font-black text-white">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</p>
          </div>
          <ChevronRight size={16} className={`text-slate-500 transition-transform ${mobileView === 'cart' ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default POS;
