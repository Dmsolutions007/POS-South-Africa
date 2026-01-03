
import React, { useState } from 'react';
import { Plus, Search, User, Phone, Mail, Award, X } from 'lucide-react';
import { AppState, Customer } from '../types';
import { CURRENCY_SYMBOL } from '../constants';

const Customers = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = state.customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
      id: `C-${Date.now()}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      loyaltyPoints: 0,
      totalSpent: 0
    };

    setState(prev => ({
      ...prev,
      customers: [...prev.customers, newCustomer]
    }));
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>New Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(customer => (
          <div key={customer.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                {customer.name.charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Spent</p>
                <p className="text-lg font-bold text-gray-900">{CURRENCY_SYMBOL}{customer.totalSpent.toFixed(2)}</p>
              </div>
            </div>
            
            <h3 className="font-bold text-gray-800 text-lg mb-4">{customer.name}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <Phone size={16} className="text-gray-400" />
                <span>{customer.phone}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                <Mail size={16} className="text-gray-400" />
                <span className="truncate">{customer.email}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-center space-x-1 text-emerald-600">
                <Award size={16} />
                <span className="text-xs font-bold uppercase">Loyalty Points</span>
              </div>
              <span className="text-sm font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                {Math.floor(customer.totalSpent / 10)} pts
              </span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Register Customer</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input name="name" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" name="email" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input type="tel" name="phone" required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-4">Save Customer</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
