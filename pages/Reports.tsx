import React, { useMemo } from 'react';
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
import { FileDown, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Package } from 'lucide-react';
import { AppState } from '../types.ts';
import { CURRENCY_SYMBOL, COLORS } from '../constants.tsx';
import { exportToExcel } from '../services/excelService.ts';

const Reports = ({ state }: { state: AppState }) => {
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
        <button 
          onClick={() => exportToExcel(state)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <FileDown size={18} />
          <span>Export Master Data</span>
        </button>
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

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Health</h3>
          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Audited Stats</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="p-8 group hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={16} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Volume</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{state.sales.length}</span>
              <span className="text-emerald-500 text-xs font-black flex items-center">
                <ArrowUpRight size={14} className="mr-1" /> 4.2%
              </span>
            </div>
          </div>
          <div className="p-8 group hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><DollarSign size={16} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Ticket Size</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{CURRENCY_SYMBOL}{avgOrderValue.toFixed(2)}</span>
            </div>
          </div>
          <div className="p-8 group hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Package size={16} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Value (Cost)</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{CURRENCY_SYMBOL}{inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="text-slate-400 text-[10px] font-bold uppercase">Net</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;