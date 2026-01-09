import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Smartphone, 
  Wifi, 
  Ticket, 
  Wallet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  ChevronRight,
  User,
  History,
  LayoutGrid,
  Coins,
  WifiOff,
  Clock
} from 'lucide-react';
import { AppState, FlashProductType, FlashTransaction } from '../types.ts';
import { FLASH_PROVIDERS, CURRENCY_SYMBOL } from '../constants.tsx';
import { FlashService } from '../services/flashService.ts';
import { generateFlashReceipt } from '../services/pdfService.ts';

const FlashServices = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [activeTab, setActiveTab] = useState<FlashProductType>('AIRTIME');
  const [selectedProvider, setSelectedProvider] = useState(FLASH_PROVIDERS[0].name);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTx, setLastTx] = useState<FlashTransaction | null>(null);
  const [isOfflineTx, setIsOfflineTx] = useState(false);
  const [isQueued, setIsQueued] = useState(false);

  useEffect(() => {
    FlashService.checkBalance().then(bal => {
      setState((prev) => ({ ...prev, flashWalletBalance: bal }));
    });
  }, []);

  const changeDue = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    const price = parseFloat(amount) || 0;
    return Math.max(0, received - price);
  }, [cashReceived, amount]);

  const handleSale = async () => {
    if (!phone || !amount || parseFloat(amount) <= 0) return;
    
    setIsProcessing(true);
    const result = await FlashService.processSale(activeTab, selectedProvider, parseFloat(amount), phone);
    
    if (result.success) {
      const vAmount = parseFloat(amount);
      const vCash = parseFloat(cashReceived) || vAmount;
      const vChange = Math.max(0, vCash - vAmount);
      const isOffline = !navigator.onLine;

      const txId = `TX-${Date.now()}`;
      const newTx: FlashTransaction = {
        id: txId,
        reference: result.ref,
        type: activeTab,
        provider: selectedProvider,
        amount: vAmount,
        customerPhone: phone,
        token: result.token,
        status: 'SUCCESS',
        timestamp: Date.now(),
        cashReceived: vCash,
        changeDue: vChange
      };

      setIsOfflineTx(isOffline);
      setIsQueued(isOffline);

      setState((prev) => ({
        ...prev,
        flashTransactions: [...prev.flashTransactions, newTx],
        flashWalletBalance: prev.flashWalletBalance - vAmount,
        queuedReceipts: isOffline ? [...prev.queuedReceipts, { type: 'FLASH', id: txId }] : prev.queuedReceipts
      }));
      setLastTx(newTx);
      setAmount("");
      setPhone("");
      setCashReceived("");
    } else {
      alert(result.error);
    }
    setIsProcessing(false);
  };

  const toggleReceiptQueue = () => {
    if (!lastTx) return;
    
    const currentlyQueued = state.queuedReceipts.some(q => q.id === lastTx.id);
    
    if (currentlyQueued) {
       setState((prev) => ({
         ...prev,
         queuedReceipts: prev.queuedReceipts.filter((q) => q.id !== lastTx.id)
       }));
       setIsQueued(false);
    } else {
      setState((prev) => ({
        ...prev,
        queuedReceipts: [...prev.queuedReceipts, { type: 'FLASH', id: lastTx.id }]
      }));
      setIsQueued(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Flash Header & Balance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Flash Float Balance</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              {CURRENCY_SYMBOL}{state.flashWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <button 
            onClick={() => FlashService.checkBalance().then(b => setState(p=>({...p, flashWalletBalance: b})))}
            className="relative z-10 p-4 bg-slate-900 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg active:scale-90"
          >
            <RefreshCw size={24} className={isProcessing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-gradient-to-tr from-blue-600 to-indigo-700 p-6 rounded-3xl text-white flex flex-col justify-center shadow-xl shadow-blue-600/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Zap size={20} fill="white" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-100">Connection State</p>
          </div>
          <p className="text-lg font-black tracking-tight leading-none">Gateway Healthy</p>
          <p className="text-[10px] font-bold text-blue-200 mt-1 uppercase tracking-tighter">API V3.2 • Latency 14ms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar bg-slate-50/50">
              {(['AIRTIME', 'DATA', 'ELECTRICITY', 'VOUCHER'] as FlashProductType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[100px] py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === tab ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>}
                </button>
              ))}
            </div>

            <div className="p-6 md:p-10 space-y-8">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 md:gap-4">
                {FLASH_PROVIDERS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedProvider(p.name)}
                    className={`group relative p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${selectedProvider === p.name ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-slate-100 hover:border-slate-200 bg-white'}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${p.color} border-2 border-white shadow-sm`}></div>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${selectedProvider === p.name ? 'text-blue-600' : 'text-slate-400'}`}>
                      {p.name}
                    </span>
                    {selectedProvider === p.name && <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5"><CheckCircle2 size={10} /></div>}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Customer MSISDN</label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="tel" 
                      placeholder="e.g. 082 000 0000"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900 shadow-inner"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Voucher Amount</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-900 text-lg">{CURRENCY_SYMBOL}</span>
                     <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 font-black text-slate-900 text-2xl shadow-inner"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cash Tendered</label>
                  <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600 text-lg">{CURRENCY_SYMBOL}</span>
                     <input 
                      type="number" 
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-4 bg-emerald-50/50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-black text-slate-900 text-2xl shadow-inner"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {parseFloat(cashReceived) > 0 && (
                <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-900 flex items-center justify-between animate-in zoom-in-95 duration-300">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Coins size={14} className="text-emerald-500" />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Customer Change Due</p>
                    </div>
                    <p className="text-4xl font-black text-emerald-500 leading-none">
                      {CURRENCY_SYMBOL}{changeDue.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Status</p>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${parseFloat(cashReceived) >= parseFloat(amount) ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {parseFloat(cashReceived) >= parseFloat(amount) ? 'Sufficient Cash' : 'Insufficient Cash'}
                    </span>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSale}
                disabled={isProcessing || !amount || !phone || (parseFloat(cashReceived) > 0 && parseFloat(cashReceived) < parseFloat(amount))}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-black py-6 rounded-3xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm active:scale-95"
              >
                {isProcessing ? (
                  <RefreshCw className="animate-spin" size={24} />
                ) : (
                  <>
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><CheckCircle2 size={20} /></div>
                    <span>Confirm Sale</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <History size={16} className="text-blue-600" />
                Live Log
              </h3>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Last 5 TX</span>
            </div>
            
            <div className="space-y-3">
              {state.flashTransactions.slice(-5).reverse().map(tx => (
                <div key={tx.id} className="p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 shadow-sm font-black text-xs uppercase">
                    {tx.provider.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1">{tx.provider} {tx.type}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {tx.customerPhone}</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className="text-sm font-black text-blue-600 leading-none mb-1.5">{CURRENCY_SYMBOL}{tx.amount.toFixed(2)}</p>
                    <button 
                      onClick={() => generateFlashReceipt(tx)}
                      className="p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-100 transition-colors"
                    >
                      <Printer size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {state.flashTransactions.length === 0 && (
                <div className="py-16 text-center text-slate-300">
                  <LayoutGrid size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No Recent Sales</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900">
             <div className="flex items-center gap-3 mb-4">
               <AlertCircle size={16} className="text-amber-500" />
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Help Center</h4>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed font-medium">Flash Merchant Support: <span className="text-white">083 903 5274</span>. Ensure you have sufficient float before processing large vouchers.</p>
          </div>
        </div>
      </div>

      {lastTx && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/10 rotate-3">
              <CheckCircle2 size={48} strokeWidth={3} />
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter leading-none">Voucher Ready</h3>
            <p className="text-slate-500 text-sm font-medium mb-4">Transaction completed successfully.</p>
            
            {isOfflineTx && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-center gap-3">
                <div className="p-2 bg-amber-500 text-white rounded-lg">
                  <WifiOff size={16} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">Queue for Sync</p>
                  <p className="text-[8px] font-bold text-amber-600 uppercase leading-tight">Receipt will print when online.</p>
                </div>
              </div>
            )}

            {lastTx.token && (
              <div className="bg-slate-950 p-6 rounded-3xl mb-8 border border-slate-800 shadow-inner group">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Voucher PIN / Token</p>
                <p className="text-2xl font-mono font-black text-blue-400 tracking-widest group-hover:scale-110 transition-transform">
                  {lastTx.token}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <button 
                onClick={() => generateFlashReceipt(lastTx)}
                className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/30"
              >
                <Printer size={20} />
                <span>Print Voucher Now</span>
              </button>

              {!navigator.onLine && (
                <button 
                  onClick={toggleReceiptQueue}
                  className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isQueued ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  <Clock size={18} />
                  <span>{isQueued ? 'Voucher in Queue' : 'Queue for Printing'}</span>
                </button>
              )}

              <button 
                onClick={() => setLastTx(null)}
                className="w-full text-slate-400 font-black py-4 hover:bg-slate-50 rounded-2xl transition-all text-[10px] uppercase tracking-widest"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashServices;