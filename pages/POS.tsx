import { useState, useMemo, useEffect, useRef } from 'react';
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
import { AppState, Product, Sale, SaleItem, Customer, FlashProductType, FlashTransaction } from '../types.ts';
import { CURRENCY_SYMBOL, TAX_RATE, FLASH_PROVIDERS } from '../constants.tsx';
import { generateReceiptPDF, generateFlashReceipt } from '../services/pdfService.ts';
import { FlashService } from '../services/flashService.ts';

const POS = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
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
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'catalog' | 'cart'>('catalog');
  const [catalogTab, setCatalogTab] = useState<'retail' | 'vas'>('retail');
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
    if (product.stock <= 0) return alert(`"${product.name}" is out of stock!`);
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

  const updateQuantity = (productId: string, delta: number) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;
    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (!existing) return prev;
      const newQty = existing.quantity + delta;
      if (newQty > product.stock && delta > 0) return prev;
      if (newQty <= 0) return prev.filter(item => item.productId !== productId);
      return prev.map(item => item.productId === productId ? { ...item, quantity: newQty, totalPrice: newQty * item.unitPrice } : item);
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

  const handleCheckout = () => {
    setIsAdminModalOpen(true);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === "1953") {
      setIsAdminModalOpen(false);
      proceedToFinalPayment();
    } else {
      setPinError("Invalid Admin PIN");
    }
  };

  const proceedToFinalPayment = () => {
    if (paymentMethod === 'CASH') finalizeSale();
    else if (paymentMethod === 'CARD') {
      setIsProcessingPayment(true);
      setTimeout(() => finalizeSale(), 1500);
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

    const isOffline = !navigator.onLine;
    setState(prev => ({
      ...prev, sales: [...prev.sales, newSale],
      products: prev.products.map(p => {
        const cartItem = cart.find(item => item.productId === p.id);
        return cartItem ? { ...p, stock: p.stock - cartItem.quantity } : p;
      }),
      queuedReceipts: isOffline ? [...prev.queuedReceipts, { type: 'RETAIL', id: saleId }] : prev.queuedReceipts
    }));

    setLastSale(newSale);
    setCart([]);
    setCashReceived("");
    setIsProcessingPayment(false);
    setShowCheckoutSuccess(true);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-4 md:gap-6 min-h-0">
      <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center gap-2 mb-3">
           <button onClick={() => setCatalogTab('retail')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${catalogTab === 'retail' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>Retail</button>
           <button onClick={() => setCatalogTab('vas')} className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest ${catalogTab === 'vas' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400'}`}>VAS / Flash</button>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex-1 flex flex-col overflow-hidden">
          {catalogTab === 'retail' ? (
            <>
              <div className="p-3 border-b border-slate-100">
                <input ref={barcodeInputRef} type="text" placeholder="Search catalog..." className="w-full px-4 py-2.5 bg-slate-50 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {filteredProducts.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)} className="p-3 bg-white rounded-2xl border hover:border-blue-500 text-left flex flex-col group">
                    <p className="text-[10px] font-black truncate">{p.name}</p>
                    <p className="text-[10px] font-black text-blue-600">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</p>
                    <span className="text-[8px] font-black uppercase text-slate-400">{p.stock} In Stock</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
             <div className="p-6">VAS interface loaded.</div>
          )}
        </div>
      </div>
      <div className={`w-full md:w-80 lg:w-96 flex flex-col min-h-0 ${mobileView === 'catalog' ? 'hidden md:flex' : 'flex'}`}>
        <div className="bg-white rounded-3xl shadow-lg border flex-1 flex flex-col overflow-hidden">
           <div className="p-4 border-b font-black text-[10px] uppercase tracking-widest">Cart</div>
           <div className="flex-1 overflow-y-auto p-3 space-y-2">
             {cart.map(item => (
               <div key={item.productId} className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                  <div className="text-[10px] font-bold truncate flex-1">{item.productName}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1"><Minus size={12}/></button>
                    <span className="text-[10px] font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1"><Plus size={12}/></button>
                  </div>
               </div>
             ))}
           </div>
           <div className="p-5 bg-slate-50 border-t space-y-4">
              <div className="flex justify-between font-black">
                <span>Total</span>
                <span>{CURRENCY_SYMBOL}{cartTotals.total.toFixed(2)}</span>
              </div>
              <button onClick={handleCheckout} disabled={cart.length === 0} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl">Checkout</button>
           </div>
        </div>
      </div>

      {isAdminModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center">
            <h3 className="font-black uppercase mb-4">Supervisor Auth</h3>
            <input type="password" autoFocus className="w-full text-center text-2xl py-3 bg-slate-100 rounded-xl" placeholder="••••" value={adminPin} onChange={(e) => setAdminPin(e.target.value)} />
            <button onClick={handleVerifyAdminPin} className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-black">Authorize</button>
          </div>
        </div>
      )}

      {showCheckoutSuccess && (
        <div className="fixed inset-0 bg-blue-600 z-[300] flex items-center justify-center text-white p-8 text-center">
          <div>
            <CheckCircle2 size={64} className="mx-auto mb-4" />
            <h2 className="text-3xl font-black uppercase italic mb-2">Success!</h2>
            <button onClick={() => setShowCheckoutSuccess(false)} className="bg-white text-blue-600 px-8 py-3 rounded-xl font-black mt-8">Back to POS</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;