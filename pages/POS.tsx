
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
  Coins
} from 'lucide-react';
import { AppState, Product, Sale, SaleItem, Customer, FlashProductType, FlashTransaction } from '../types';
import { CURRENCY_SYMBOL, TAX_RATE, FLASH_PROVIDERS } from '../constants';
import { generateReceiptPDF, generateFlashReceipt } from '../services/pdfService';
import { FlashService } from '../services/flashService';

// Fix: Added missing component logic and default export for POS module
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

    setState(prev => ({
      ...prev,
      sales: [...prev.sales, newSale],
      products: prev.products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
        return p;
      })
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

      const newTx: FlashTransaction = {
        id: `TX-${Date.now()}`,
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
        flashWalletBalance: prev.flashWalletBalance - vAmount
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

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col md:flex-row gap-6">
      {/* Catalog / Left Panel */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2 mb-4">
           <button 
             onClick={() => setCatalogTab('retail')}
             className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${catalogTab === 'retail' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 border border-slate-100'}`}
           >
             Retail Items
           </button>
           <button 
             onClick={() => setCatalogTab('vas')}
             className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${catalogTab === 'vas' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 border border-slate-100'}`}
           >
             VAS / Flash
           </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
          {catalogTab === 'retail' ? (
            <>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    ref={barcodeInputRef}
                    type="text" 
                    placeholder="Search or scan barcode..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="p-3 bg-white rounded-2xl border border-slate-100 hover:border-blue-500 hover:shadow-md transition-all text-left flex flex-col group active:scale-95"
                  >
                    <div className="w-full aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
                      <Package size={32} />
                    </div>
                    <p className="text-[11px] font-black text-slate-900 leading-tight mb-1 truncate">{p.name}</p>
                    <p className="text-[10px] font-black text-blue-600 mb-2">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</p>
                    <div className="mt-auto flex items-center justify-between">
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${p.stock <= p.lowStockThreshold ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {p.stock} In Stock
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
            <div className="flex-1 flex flex-col p-6 space-y-8 overflow-y-auto">
              <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar pb-2">
                {(['AIRTIME', 'DATA', 'ELECTRICITY', 'VOUCHER'] as FlashProductType[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setVasTab(tab)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${vasTab === tab ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    {tab}
                    {vasTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></div>}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {FLASH_PROVIDERS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedProvider(p.name)}
                    className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedProvider === p.name ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-white'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${p.color} border-2 border-white shadow-sm`}></div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedProvider === p.name ? 'text-blue-600' : 'text-slate-400'}`}>{p.name}</span>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer Phone</label>
                  <input 
                    type="tel" 
                    placeholder="082 000 0000"
                    className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold"
                    value={vasPhone}
                    onChange={(e) => setVasPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-900">{CURRENCY_SYMBOL}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-black text-xl"
                      value={vasAmount}
                      onChange={(e) => setVasAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash Tendered</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600">{CURRENCY_SYMBOL}</span>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-4 bg-emerald-50/50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-black text-xl"
                      value={vasCashReceived}
                      onChange={(e) => setVasCashReceived(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {parseFloat(vasCashReceived) > 0 && (
                <div className="bg-slate-900 p-6 rounded-3xl flex items-center justify-between animate-in slide-in-from-top-2">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Change Due</p>
                    <p className="text-2xl font-black text-emerald-500">{CURRENCY_SYMBOL}{vasChangeDue.toFixed(2)}</p>
                  </div>
                  <Coins className="text-emerald-500/20" size={40} />
                </div>
              )}

              <button 
                onClick={handleVasSale}
                disabled={isVasProcessing || !vasAmount || !vasPhone || (parseFloat(vasCashReceived) > 0 && parseFloat(vasCashReceived) < parseFloat(vasAmount))}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl transition-all flex items-center justify-center gap-4 uppercase tracking-widest text-xs active:scale-95"
              >
                {isVasProcessing ? <RefreshCw className="animate-spin" /> : <span>Confirm VAS Sale</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cart / Right Panel */}
      <div className={`w-full md:w-96 flex flex-col ${mobileView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 flex-1 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <ShoppingCart size={16} className="text-blue-600" />
              Current Order
            </h3>
            <button onClick={() => setCart([])} className="text-[10px] font-black text-red-500 uppercase hover:underline">Clear</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.map(item => (
              <div key={item.productId} className="p-3 bg-slate-50 rounded-2xl flex items-center gap-3 group animate-in slide-in-from-right-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">{item.productName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{CURRENCY_SYMBOL}{item.unitPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-sm">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:text-blue-600"><Minus size={14} /></button>
                  <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:text-blue-600"><Plus size={14} /></button>
                </div>
                <p className="text-xs font-black text-slate-900 w-16 text-right">{CURRENCY_SYMBOL}{item.totalPrice.toFixed(2)}</p>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400">
                <ShoppingCart size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest">Cart is empty</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Subtotal</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>VAT (15%)</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'CARD', 'EFT'] as const).map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 rounded-xl flex flex-col items-center gap-1 transition-all ${paymentMethod === method ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-500'}`}
                >
                  {method === 'CASH' ? <Banknote size={16} /> : method === 'CARD' ? <CreditCard size={16} /> : <Smartphone size={16} />}
                  <span className="text-[8px] font-black uppercase">{method}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-2 animate-in slide-in-from-bottom-2">
                <input 
                  type="number"
                  placeholder="Cash Amount Received"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-black text-center"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
                {parseFloat(cashReceived) > 0 && (
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Due:</span>
                    <span className="text-sm font-black text-emerald-600">{CURRENCY_SYMBOL}{changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || (paymentMethod === 'CASH' && (!cashReceived || parseFloat(cashReceived) < cartTotals.total))}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-600/20 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <CheckCircle size={18} />
              <span>Complete Sale</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin PIN Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <LockKeyhole size={18} className="text-blue-600" />
                 <h3 className="text-xs font-black uppercase tracking-widest">Supervisor Authorization</h3>
               </div>
               <button onClick={() => setIsAdminModalOpen(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={handleVerifyAdminPin} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Enter Admin Access PIN</label>
                <input 
                  type="password" 
                  autoFocus
                  className="w-full text-center text-3xl font-black py-4 bg-slate-50 border-none rounded-3xl tracking-[0.5em] focus:ring-2 focus:ring-blue-500"
                  placeholder="••••"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                />
                {pinError && <p className="text-[9px] text-red-500 font-bold text-center leading-tight mt-2">{pinError}</p>}
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Verify PIN</button>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showCheckoutSuccess && lastSale && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-90 duration-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/10 rotate-3">
              <CheckCircle2 size={48} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Sale Complete</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Ref: {lastSale.id}</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => generateReceiptPDF(lastSale, lastSale.items)}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-600/30"
              >
                <Printer size={20} />
                <span>Print Receipt</span>
              </button>
              <button 
                onClick={() => setShowCheckoutSuccess(false)}
                className="w-full text-slate-400 py-4 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Cart Button */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950 px-6 py-4 rounded-full shadow-2xl z-40">
        <button 
          onClick={() => setMobileView(mobileView === 'catalog' ? 'cart' : 'catalog')}
          className="flex items-center gap-3"
        >
          <div className="relative">
            <ShoppingCart size={24} className="text-white" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-950">{cart.length}</span>
            )}
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-slate-500 uppercase leading-none">Cart Total</p>
            <p className="text-sm font-black text-white">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default POS;
