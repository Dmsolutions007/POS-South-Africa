
import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Sparkles } from 'lucide-react';
import { AppState } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import { getBusinessInsights } from '../services/geminiService';

const StatCard = ({ icon: Icon, label, value, color, trend }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="text-white" size={24} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-sm font-medium text-gray-500 mb-1">{label}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

const Dashboard = ({ state }: { state: AppState }) => {
  const [insights, setInsights] = useState<string>("Analyzing your data...");

  const stats = useMemo(() => {
    const today = new Date().setHours(0, 0, 0, 0);
    const todaySales = state.sales.filter(s => s.timestamp >= today);
    const totalRevenue = state.sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const dailyRevenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const lowStock = state.products.filter(p => p.stock <= p.lowStockThreshold).length;

    return {
      totalRevenue,
      dailyRevenue,
      lowStock,
      customerCount: state.customers.length
    };
  }, [state]);

  useEffect(() => {
    const fetchInsights = async () => {
      const result = await getBusinessInsights(state.products, state.sales);
      setInsights(result);
    };
    fetchInsights();
  }, [state.products, state.sales]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={DollarSign} 
          label="Total Revenue" 
          value={`${CURRENCY_SYMBOL}${stats.totalRevenue.toLocaleString()}`} 
          color="bg-blue-600"
          trend="+12%"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Today's Sales" 
          value={`${CURRENCY_SYMBOL}${stats.dailyRevenue.toLocaleString()}`} 
          color="bg-emerald-500"
        />
        <StatCard 
          icon={Package} 
          label="Low Stock Items" 
          value={stats.lowStock} 
          color="bg-amber-500"
          trend={stats.lowStock > 0 ? "Alert" : undefined}
        />
        <StatCard 
          icon={Users} 
          label="Total Customers" 
          value={stats.customerCount} 
          color="bg-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Recent Sales History</h3>
            <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                  <th className="px-6 py-4">Sale ID</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {state.sales.slice(-5).reverse().map(sale => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">#{sale.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(sale.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4 text-gray-500">{sale.items.length}</td>
                    <td className="px-6 py-4 font-semibold">{CURRENCY_SYMBOL}{sale.totalAmount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Completed</span>
                    </td>
                  </tr>
                ))}
                {state.sales.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No sales recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insights & Alerts */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
            <Sparkles className="absolute -right-4 -top-4 opacity-20" size={100} />
            <div className="flex items-center space-x-2 mb-4 relative z-10">
              <Sparkles size={18} />
              <h3 className="font-bold">Business Intelligence</h3>
            </div>
            <div className="text-sm opacity-90 leading-relaxed whitespace-pre-line relative z-10">
              {insights}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <AlertTriangle className="text-amber-500" size={18} />
              <span>Stock Alerts</span>
            </h3>
            <div className="space-y-4">
              {state.products.filter(p => p.stock <= p.lowStockThreshold).slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-red-500">Only {p.stock} left</p>
                  </div>
                  <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${(p.stock / (p.lowStockThreshold * 2)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.lowStock === 0 && (
                <p className="text-sm text-gray-500 italic">Inventory levels are healthy.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
