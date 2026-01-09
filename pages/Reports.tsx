import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { FileDown, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Package, CheckCircle2, ShieldAlert } from 'lucide-react';
import { AppState } from '../types.ts';
import { CURRENCY_SYMBOL, COLORS } from '../constants.tsx';
import { exportToExcel } from '../services/excelService.ts';

const Reports = ({ state }: { state: AppState }) => {
  const [showZReport, setShowZReport] = useState(false);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(dateStr => {
      const daySales = state.sales.filter(s => new Date(s.timestamp).toISOString().split('T')[0] === dateStr);
      return {
        date: dateStr.split('-').slice(1).join('/'),
        revenue: daySales.reduce((acc, s) => acc + s.totalAmount, 0),
        count: daySales.length
      };
    });
  }, [state.sales]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    state.products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [state.products]);

  const dailyStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = state.sales.filter(s => new Date(s.timestamp).toISOString().split('T')[0] === todayStr);
    const revenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const cash = todaySales.filter(s => s.paymentMethod === 'CASH').reduce((acc, s) => acc + s.totalAmount, 0);
    const card = todaySales.filter(s => s.paymentMethod === 'CARD').reduce((acc, s) => acc + s.totalAmount, 0);
    return { count: todaySales.length, revenue, cash, card };
  }, [state.sales]);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const inventoryValue = useMemo(() => 
    state.products.reduce((a, b) => a + (b.costPrice * b.stock), 0),
  [state.products]);

  const avgOrderValue = useMemo(() => 
    state.sales.length > 0 ? (state.sales.reduce((a, b) => a + b.totalAmount, 0) / state.sales.length) : 0,
  [state.sales]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 text-slate-500">
          <Calendar size={20} className="text-blue-600" />
          <span className="text-xs md:text-sm font-black uppercase tracking-widest">Period: Last 7 Days</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowZReport(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <ShieldAlert size={18} />
            <span>Generate Z-Report</span>
          </button>
          <button 
            onClick={() => exportToExcel(state)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            <FileDown size={18} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Revenue Performance</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  tickFormatter={(val) => `${CURRENCY_SYMBOL}${val}`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Category Share</h3>
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="h-56 w-56 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-4 w-full sm:w-auto">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-none">{entry.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{entry.value} items</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* End of Day Modal */}
      {showZReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
             <div className="text-center mb-6">
               <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" />
               <h3 className="text-xl font-black uppercase tracking-widest">Z-Report Generated</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
             </div>
             <div className="space-y-4 border-y border-slate-100 py-6">
                <div className="flex justify-between font-black text-xs uppercase tracking-widest">
                  <span className="text-slate-400">Total Sales</span>
                  <span>{dailyStats.count}</span>
                </div>
                <div className="flex justify-between font-black text-xs uppercase tracking-widest">
                  <span className="text-slate-400">Cash in Drawer</span>
                  <span className="text-emerald-600">{CURRENCY_SYMBOL}{dailyStats.cash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-xs uppercase tracking-widest">
                  <span className="text-slate-400">Card Total</span>
                  <span className="text-blue-600">{CURRENCY_SYMBOL}{dailyStats.card.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-lg">
                  <span className="italic">GROSS</span>
                  <span>{CURRENCY_SYMBOL}{dailyStats.revenue.toFixed(2)}</span>
                </div>
             </div>
             <div className="mt-8 flex gap-3">
               <button onClick={() => setShowZReport(false)} className="flex-1 py-4 font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50 rounded-xl">Dismiss</button>
               <button onClick={() => { window.print(); setShowZReport(false); }} className="flex-1 py-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Print Z-Report</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;