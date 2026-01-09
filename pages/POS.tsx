import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Edit3,
  CreditCard, 
  Banknote, 
  Smartphone,
  X,
  User as UserIcon,
  Package,
  ShoppingCart,
  Printer,
  ChevronRight,
  Zap,
  RefreshCw,
  CheckCircle2,
  LockKeyhole,
  Coins,
  WifiOff,
  Clock,
  ArrowLeft,
  ScanLine,
  Tag,
  History,
  Ban
} from 'lucide-react';
import { AppState, Product, Sale, SaleItem, Customer, FlashProductType, FlashTransaction, UserRole } from '../types.ts';
import { CURRENCY_SYMBOL, TAX_RATE, FLASH_PROVIDERS } from '../constants.tsx';
import { generateReceiptPDF, generateFlashReceipt } from '../services/pdfService.ts';
import { FlashService } from '../services/flashService.ts';

const POS = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'EFT'>('CASH');
  const [cashReceived, setCashReceived] = useState<string>("");
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');
  const [catalogTab, setCatalogTab] = useState<'retail' | 'vas'>('retail');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // VAS States
  const [vasTab, setVasTab] = useState<FlashProductType>('AIRTIME');
  const [selectedProvider, setSelectedProvider] = useState(FLASH_PROVIDERS[0].name);
  const [vasAmount, setVasAmount] = useState("");
  const [vasPhone, setVasPhone] = useState("");
  const [isVasProcessing, setIsVasProcessing] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    return state.products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.barcode.includes(search) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    );
  }, [state.products, search]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
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
        productId: product.id, productName: product.name,
        quantity: 1, unitPrice: product.price, totalPrice: product.price
      }];
    });
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const editItem = (productId: string) => {
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    const newQtyStr = prompt(`Change quantity for ${item.productName}:`, item.quantity.toString());
    if (newQtyStr !== null) {
      const qty = parseInt(newQtyStr);
      if (!isNaN(qty) && qty > 0) {
        setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: qty, totalPrice: qty * i.unitPrice } : i));
      } else if (qty === 0) {
        removeItem(productId);
      }
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty <= 0) return prev.filter(item => item.productId !== productId);
      return prev.map(item => item.productId === productId ? { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice } : item);
    });
  };

  const cartTotals = useMemo(() => {
    const grossSubtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
    const discountAmount = grossSubtotal * (discountPercent / 100);
    const subtotal = grossSubtotal - discountAmount;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax; 
    return { grossSubtotal, discountAmount, subtotal, tax, total };
  }, [cart, discountPercent]);

  const changeDue = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    return Math.max(0, received - cartTotals.total);
  }, [cashReceived, cartTotals.total]);

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "1953") {
      setIsAdminModalOpen(false);
      setPinError(null);
      setAdminPin("");
      finalizeSale();
    } else {
      setPinError("Invalid Admin PIN");
    }
  };

  const finalizeSale = () => {
    const saleId = `SALE-${Date.now()}`;
    const newSale: Sale = {
      id: saleId, timestamp: Date.now(), items: [...cart],
      totalAmount: cartTotals.total, taxAmount: cartTotals.tax,
      paymentMethod, cashierId: state.currentUser?.id || 'unknown',
      currency: CURRENCY_SYMBOL,
      cashReceived: paymentMethod === 'CASH' ? parseFloat(cashReceived) : undefined,
      changeDue: paymentMethod === 'CASH' ? changeDue : undefined
    };

    setState(prev => ({
      ...prev, sales: [...prev.sales, newSale],
      products: prev.products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
      }),
    }));

    setLastSale(newSale);
    setCart([]);
    setCashReceived("");
    setDiscountPercent(0);
    setIsProcessingPayment(false);
    setShowCheckoutSuccess(true);
  };

  const handleVasSale = async () => {
    if (!vasPhone || !vasAmount) return;
    setIsVasProcessing(true);
    const result = await FlashService.processSale(vasTab, selectedProvider, parseFloat(vasAmount), vasPhone);
    if (result.success) {
      const txId = `TX-${Date.now()}`;
      const newTx: FlashTransaction = {
        id: txId, reference: result.ref, type: vasTab, provider: selectedProvider,
        amount: parseFloat(vasAmount), customerPhone: vasPhone, token: result.token,
        status: 'SUCCESS', timestamp: Date.now()
      };
      setState(prev => ({
        ...prev, 
        flashTransactions: [...prev.flashTransactions, newTx],
        flashWalletBalance: prev.flashWalletBalance - parseFloat(vasAmount)
      }));
      setVasAmount("");
      setVasPhone("");
      generateFlashReceipt(newTx);
    } else {
      alert(result.error);
    }
    setIsVasProcessing(false);
  };

  const voidSale = (saleId: string) => {
    if (confirm("Void this transaction and restore stock?")) {
      const saleToVoid = state.sales.find(s => s.id === saleId);
      if (!saleToVoid) return;

      setState(prev => ({
        ...prev,
        sales: prev.sales.filter(s => s.id !== saleId),
        products: prev.products.map(p => {
          const item = saleToVoid.items.find(i => i.productId === p.id);
          return item ? { ...p, stock: p.stock + item.quantity } : p;
        })
      }));
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 min-h-0 bg-slate-50/50 rounded-3xl p-2 md:p-4">
      {/* Catalog Side */}
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2 mb-4">
          <button 
            onClick={() => setCatalogTab('retail')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${catalogTab === 'retail' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
          >
            <Package size={16} /> Retail Catalog
          </button>
          <button 
            onClick={() => setCatalogTab('vas')} 
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${catalogTab === 'vas' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
          >
            <Zap size={16} /> VAS / Flash
          </button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
          {catalogTab === 'retail' ? (
            <>
              <div className="p-4 border-b border-slate-50 flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    ref={barcodeInputRef} 
                    type="text" 
                    placeholder="Type name..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm font-medium" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                  <ScanLine className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProducts.map(p => (
                  <button 
                    key={p.id} 
                    onClick={() => addToCart(p)} 
                    disabled={p.stock <= 0}
                    className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-blue-500 hover:shadow-md text-left flex flex-col gap-2 transition-all group active:scale-95 disabled:opacity-50 disabled:grayscale"
                  >
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{p.name}</p>
                      <p className="text-[10px] font-bold text-blue-600">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.stock <= p.lowStockThreshold ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        <span className="text-[9px] font-black uppercase text-slate-400">{p.stock} Unit</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
             <div className="p-6 h-full flex flex-col">
               <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                 {(['AIRTIME', 'DATA', 'ELECTRICITY', 'VOUCHER'] as FlashProductType[]).map(tab => (
                   <button key={tab} onClick={() => setVasTab(tab)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${vasTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{tab}</button>
                 ))}
               </div>
               <div className="flex-1 space-y-6">
                 <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                   {FLASH_PROVIDERS.map(p => (
                     <button key={p.name} onClick={() => setSelectedProvider(p.name)} className={`p-3 rounded-xl border text-[9px] font-black uppercase transition-all ${selectedProvider === p.name ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 bg-white text-slate-400'}`}>{p.name}</button>
                   ))}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Phone Number</label>
                     <input type="tel" placeholder="082..." className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={vasPhone} onChange={e => setVasPhone(e.target.value)} />
                   </div>
                   <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Amount</label>
                     <input type="number" placeholder="ZAR 0.00" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={vasAmount} onChange={e => setVasAmount(e.target.value)} />
                   </div>
                 </div>
                 <button onClick={handleVasSale} disabled={isVasProcessing || !vasAmount || !vasPhone} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-900/10">
                   {isVasProcessing ? <RefreshCw className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                   CONFIRM FLASH SALE
                 </button>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Cart Side */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col min-h-0 ${mobileView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 flex-1 flex flex-col overflow-hidden">
           <div className="p-5 border-b border-slate-50 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <ShoppingCart size={20} className="text-blue-600" />
               <h3 className="font-black text-[12px] uppercase tracking-widest text-slate-900">Active Cart</h3>
             </div>
             <button onClick={() => { setCart([]); setDiscountPercent(0); }} className="text-slate-300 hover:text-red-500 transition-colors">
               <Trash2 size={16} />
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.map(item => (
               <div key={item.productId} className="flex flex-col bg-slate-50/50 p-3 rounded-2xl border border-slate-50 group hover:bg-white hover:shadow-sm transition-all gap-2">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight">{item.productName}</p>
                      <p className="text-[10px] font-bold text-slate-400">{CURRENCY_SYMBOL}{item.unitPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => editItem(item.productId)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={12}/></button>
                      <button onClick={() => removeItem(item.productId)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={12}/></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 p-1">
                      <button onClick={() => updateQuantity(item.productId, -1)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"><Minus size={12}/></button>
                      <button onClick={() => editItem(item.productId)} className="text-[11px] font-black w-8 text-center hover:text-blue-600 transition-colors">{item.quantity}</button>
                      <button onClick={() => updateQuantity(item.productId, 1)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"><Plus size={12}/></button>
                    </div>
                    <div className="text-[11px] font-black text-slate-900">{CURRENCY_SYMBOL}{item.totalPrice.toFixed(2)}</div>
                  </div>
               </div>
             ))}
             {cart.length === 0 && (
               <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-20">
                 <ShoppingCart size={64} className="mb-4" />
                 <p className="text-xs font-black uppercase tracking-widest">Cart is empty</p>
               </div>
             )}
           </div>

           <div className="p-6 bg-slate-950 text-white rounded-t-[2.5rem] space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>{CURRENCY_SYMBOL}{cartTotals.grossSubtotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                    <span>Discount ({discountPercent}%)</span>
                    <span>-{CURRENCY_SYMBOL}{cartTotals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  <span>Tax (15%)</span>
                  <span>{CURRENCY_SYMBOL}{cartTotals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-2xl font-black mt-2">
                  <span className="tracking-tighter italic">TOTAL</span>
                  <span className="text-blue-400">{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setDiscountPercent(prev => prev === 10 ? 0 : 10)} 
                  className={`py-3 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${discountPercent > 0 ? 'bg-emerald-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                >
                  <Tag size={12} /> {discountPercent > 0 ? `${discountPercent}% Off` : 'Add 10% Discount'}
                </button>
                <button 
                  onClick={() => setPaymentMethod(paymentMethod === 'CASH' ? 'CARD' : 'CASH')} 
                  className="py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {paymentMethod === 'CASH' ? <Banknote size={12}/> : <CreditCard size={12}/>} {paymentMethod}
                </button>
              </div>

              {paymentMethod === 'CASH' && (
                <div className="relative animate-in slide-in-from-bottom-2">
                   <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                   <input 
                    type="number" 
                    placeholder="Cash Received..." 
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 text-white font-bold"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                  />
                </div>
              )}

              <button 
                onClick={() => setIsAdminModalOpen(true)} 
                disabled={cart.length === 0 || (paymentMethod === 'CASH' && !cashReceived)} 
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-900/40"
              >
                <LockKeyhole size={18} />
                AUTHORIZE SALE
              </button>
           </div>
        </div>

        {/* Quick History Sidebar Fragment */}
        <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
           <div className="flex items-center gap-2 mb-4">
             <History size={14} className="text-slate-400" />
             <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Recent Activity</h4>
           </div>
           <div className="space-y-2">
             {state.sales.slice(-3).reverse().map(s => (
               <div key={s.id} className="flex items-center justify-between group">
                  <span className="text-[10px] font-bold text-slate-600">#{s.id.split('-')[1]}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => voidSale(s.id)} className="p-1 hover:text-red-500"><Ban size={10} /></button>
                    <button onClick={() => generateReceiptPDF(s, s.items)} className="p-1 hover:text-blue-500"><Printer size={10} /></button>
                  </div>
                  <span className="text-[10px] font-black text-slate-900">{CURRENCY_SYMBOL}{s.totalAmount.toFixed(2)}</span>
               </div>
             ))}
           </div>
        </div>
      </div>

      {/* Admin Auth Modal */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/10">
              <LockKeyhole size={32} />
            </div>
            <h3 className="text-lg font-black uppercase tracking-widest text-slate-900 mb-2">Supervisor Auth</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-8">Terminal locked for authorization</p>
            <input 
              type="password" 
              autoFocus 
              className="w-full text-center text-4xl tracking-[0.5em] py-5 bg-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 border-none font-black text-slate-900 mb-4" 
              placeholder="••••" 
              value={adminPin} 
              onChange={(e) => setAdminPin(e.target.value)} 
            />
            {pinError && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mb-4">{pinError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setIsAdminModalOpen(false)} className="py-4 rounded-xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50">Cancel</button>
              <button onClick={handleVerifyAdminPin} className="py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Verify</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showCheckoutSuccess && lastSale && (
        <div className="fixed inset-0 bg-blue-600 z-[300] flex items-center justify-center text-white p-8 animate-in fade-in duration-500">
          <div className="max-w-md w-full text-center space-y-10">
            <div className="space-y-4">
              <div className="w-24 h-24 bg-white text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <CheckCircle2 size={56} />
              </div>
              <h2 className="text-5xl font-black uppercase italic tracking-tighter leading-none">SALE RECORDED</h2>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">Reference: {lastSale.id}</p>
            </div>

            {lastSale.paymentMethod === 'CASH' && (
              <div className="bg-white/10 p-8 rounded-[2rem] border border-white/10 backdrop-blur-md">
                <p className="text-[10px] font-black text-blue-200 uppercase tracking-[0.2em] mb-2">Change to Customer</p>
                <p className="text-6xl font-black tracking-tighter italic">
                  {CURRENCY_SYMBOL}{lastSale.changeDue?.toFixed(2)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => generateReceiptPDF(lastSale, lastSale.items)} 
                className="bg-white text-blue-600 w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Printer size={20} /> Print Receipt
              </button>
              <button 
                onClick={() => setShowCheckoutSuccess(false)} 
                className="bg-blue-700 hover:bg-blue-800 text-white w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
              >
                New Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;