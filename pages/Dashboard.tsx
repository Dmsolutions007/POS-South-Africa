
import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Sparkles } from 'lucide-react';
import { AppState } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import { getBusinessInsights } from '../services/geminiService';

const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
  <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-200 transition-all">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${color} shadow-lg shadow-blue-500/10 transition-transform group-hover:scale-110`}>
        <Icon className="text-white" size={20} />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</h3>
    <p className="text-xl md:text-2xl font-black text-slate-900">{value}</p>
  </div>
);

const Dashboard = ({ state }: { state: AppState }) => {
  const [insights, setInsights] = useState<string>("Running diagnostic analysis...");

  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todaySales = state.sales.filter(s => s.timestamp >= today);
    const totalRevenue = state.sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const dailyRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const lowStock = state.products.filter(p => p.stock <= p.lowStockThreshold).length;

    return { totalRevenue, dailyRevenue, lowStock, customerCount: state.customers.length };
  }, [state]);

  useEffect(() => {
    const fetchInsights = async () => {
      const result = await getBusinessInsights(state.products, state.sales);
      setInsights(result);
    };
    fetchInsights();
  }, [state.products, state.sales]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Dynamic Responsive Grid for Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
          icon={DollarSign} 
          label="Gross Revenue" 
          value={`${CURRENCY_SYMBOL}${stats.totalRevenue.toLocaleString()}`} 
          color="bg-slate-900"
          trend="+14%"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Today's Target" 
          value={`${CURRENCY_SYMBOL}${stats.dailyRevenue.toLocaleString()}`} 
          color="bg-blue-600"
        />
        <StatCard 
          icon={Package} 
          label="Inventory Alerts" 
          value={stats.lowStock} 
          color="bg-amber-500"
          trend={stats.lowStock > 0 ? "Critical" : undefined}
        />
        <StatCard 
          icon={Users} 
          label="Customer Base" 
          value={stats.customerCount} 
          color="bg-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity with Responsive Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Recent Sales</h3>
            <button className="text-[10px] text-blue-600 font-bold uppercase hover:underline">Full Log</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Ref</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {state.sales.slice(-6).reverse().map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-xs truncate max-w-[100px]">#{sale.id.split('-')[1]}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-600 text-xs">{sale.items.length}</td>
                    <td className="px-6 py-4 font-black text-slate-900 text-xs">{CURRENCY_SYMBOL}{sale.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase">Paid</span>
                    </td>
                  </tr>
                ))}
                {state.sales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-50">Waitlisted for data...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Intelligence & Alerts */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-3xl shadow-xl p-6 text-white relative overflow-hidden group">
            <Sparkles className="absolute -right-6 -bottom-6 opacity-10 transition-transform group-hover:scale-125 duration-700" size={150} />
            <div className="flex items-center space-x-2 mb-4 relative z-10">
              <Sparkles size={16} className="text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-100">AI Core Insights</h3>
            </div>
            <div className="text-xs font-medium text-slate-200 leading-relaxed whitespace-pre-line relative z-10 min-h-[120px]">
              {insights}
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center relative z-10">
               <span className="text-[8px] font-bold text-blue-300 uppercase">Analysis: Realtime</span>
               <div className="flex gap-1">
                 <div className="w-1 h-1 rounded-full bg-blue-400 animate-ping"></div>
                 <div className="w-1 h-1 rounded-full bg-blue-400"></div>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={16} />
              Stock Health
            </h3>
            <div className="space-y-5">
              {state.products.filter(p => p.stock <= p.lowStockThreshold).slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-[11px] font-bold text-slate-700 truncate mb-1">{p.name}</p>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${p.stock <= p.lowStockThreshold ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, (p.stock / (p.lowStockThreshold || 1)) * 50)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">{p.stock} LEFT</span>
                </div>
              ))}
              {stats.lowStock === 0 && (
                <div className="text-center py-6">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Inventory Levels Optimal</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
