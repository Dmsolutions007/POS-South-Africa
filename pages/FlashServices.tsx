
import React, { useState, useEffect } from 'react';
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
  User
} from 'lucide-react';
import { AppState, FlashProductType, FlashTransaction } from '../types';
import { FLASH_PROVIDERS, CURRENCY_SYMBOL } from '../constants';
import { FlashService } from '../services/flashService';
import { generateFlashReceipt } from '../services/pdfService';

const FlashServices = ({ state, setState }: { state: AppState, setState: React.Dispatch<any> }) => {
  const [activeTab, setActiveTab] = useState<FlashProductType>('AIRTIME');
  const [selectedProvider, setSelectedProvider] = useState(FLASH_PROVIDERS[0].name);
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastTx, setLastTx] = useState<FlashTransaction | null>(null);

  // Sync wallet balance on mount
  useEffect(() => {
    FlashService.checkBalance().then(bal => {
      setState((prev: any) => ({ ...prev, flashWalletBalance: bal }));
    });
  }, []);

  const handleSale = async () => {
    if (!phone || !amount || parseFloat(amount) <= 0) return;
    
    setIsProcessing(true);
    const result = await FlashService.processSale(activeTab, selectedProvider, parseFloat(amount), phone);
    
    if (result.success) {
      const newTx: FlashTransaction = {
        id: `TX-${Date.now()}`,
        reference: result.ref,
        type: activeTab,
        provider: selectedProvider,
        amount: parseFloat(amount),
        customerPhone: phone,
        token: result.token,
        status: 'SUCCESS',
        timestamp: Date.now()
      };

      setState((prev: any) => ({
        ...prev,
        flashTransactions: [...prev.flashTransactions, newTx],
        flashWalletBalance: prev.flashWalletBalance - parseFloat(amount)
      }));
      setLastTx(newTx);
    } else {
      alert(result.error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Flash Header & Balance */}
      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Flash Wallet Balance</p>
            <h2 className="text-3xl font-black text-slate-900">
              {CURRENCY_SYMBOL}{state.flashWalletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h2>
          </div>
          <button 
            onClick={() => FlashService.checkBalance().then(b => setState((p:any)=>({...p, flashWalletBalance: b})))}
            className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="bg-slate-900 p-6 rounded-2xl text-white flex items-center gap-4 w-full md:w-auto">
          <div className="p-3 bg-blue-500 rounded-xl">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase">Flash Status</p>
            <p className="font-bold">Merchant Integrated</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Interface */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-100">
              {(['AIRTIME', 'DATA', 'ELECTRICITY', 'VOUCHER'] as FlashProductType[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-8 space-y-6">
              {/* Provider Selection */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {FLASH_PROVIDERS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => setSelectedProvider(p.name)}
                    className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${selectedProvider === p.name ? 'border-blue-500 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Customer Phone</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="tel" 
                      placeholder="082 123 4567"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Amount ({CURRENCY_SYMBOL})</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleSale}
                disabled={isProcessing || !amount || !phone}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white font-bold py-5 rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {isProcessing ? (
                  <RefreshCw className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>Process Flash Sale</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Flash History */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <RefreshCw size={18} className="text-blue-600" />
              Recent VAS Activity
            </h3>
            <div className="space-y-4">
              {state.flashTransactions.slice(-5).reverse().map(tx => (
                <div key={tx.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{tx.provider} {tx.type}</p>
                    <p className="text-[10px] text-gray-400">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">{CURRENCY_SYMBOL}{tx.amount.toFixed(2)}</p>
                    <button 
                      onClick={() => generateFlashReceipt(tx)}
                      className="text-[10px] font-bold text-slate-400 hover:text-blue-600 flex items-center justify-end gap-1"
                    >
                      <Printer size={10} />
                      Reprint
                    </button>
                  </div>
                </div>
              ))}
              {state.flashTransactions.length === 0 && (
                <div className="py-10 text-center text-gray-300">
                  <Smartphone size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No transactions recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {lastTx && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Sale Successful</h3>
            <p className="text-slate-500 text-sm mb-4">The Flash transaction has been processed and logged.</p>
            
            {lastTx.token && (
              <div className="bg-slate-50 p-4 rounded-2xl mb-6 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Voucher PIN / Meter Token</p>
                <p className="text-xl font-mono font-bold text-blue-600 tracking-wider">{lastTx.token}</p>
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => generateFlashReceipt(lastTx)}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-lg"
              >
                <Printer size={20} />
                <span>Print Flash Receipt</span>
              </button>
              <button 
                onClick={() => setLastTx(null)}
                className="w-full text-slate-500 font-bold py-3 hover:bg-slate-50 rounded-2xl transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlashServices;
