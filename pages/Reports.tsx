
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
import { FileDown, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AppState } from '../types';
import { CURRENCY_SYMBOL, COLORS } from '../constants';
import { exportToExcel } from '../services/excelService';

const Reports = ({ state }: { state: AppState }) => {
  const chartData = useMemo(() => {
    // Group sales by day for the last 7 days
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-gray-500">
          <Calendar size={18} />
          <span className="text-sm font-medium">Reporting Period: Last 7 Days</span>
        </div>
        <button 
          onClick={() => exportToExcel(state)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:bg-emerald-700 transition-colors"
        >
          <FileDown size={18} />
          <span>Export Excel Master</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Revenue Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${CURRENCY_SYMBOL}${value.toFixed(2)}`, 'Revenue']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Category Breakdown */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Product Categories</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-1/3 space-y-2">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                  <span className="text-xs text-gray-600 truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 font-bold text-gray-800">Operational Summary</div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          <div className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Sales Volume</p>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{state.sales.length}</span>
              <span className="text-green-500 text-xs font-medium flex items-center"><ArrowUpRight size={14}/> 4.5%</span>
            </div>
          </div>
          <div className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Average Order Value</p>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                {CURRENCY_SYMBOL}{(state.sales.reduce((a, b) => a + b.totalAmount, 0) / (state.sales.length || 1)).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-6">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Inventory Value (Cost)</p>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">
                {CURRENCY_SYMBOL}{state.products.reduce((a, b) => a + (b.costPrice * b.stock), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
