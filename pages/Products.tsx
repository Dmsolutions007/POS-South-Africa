
import React, { useState } from 'react';
import { Plus, Search, Filter, Edit3, Trash2, Download, X } from 'lucide-react';
import { AppState, Product, UserRole } from '../types';
import { CURRENCY_SYMBOL } from '../constants';

const Products = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const isAdmin = state.currentUser?.role === UserRole.ADMIN;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const productData = {
      id: editingProduct?.id || `P-${Date.now()}`,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      barcode: formData.get('barcode') as string,
      price: parseFloat(formData.get('price') as string),
      costPrice: parseFloat(formData.get('costPrice') as string),
      stock: parseInt(formData.get('stock') as string),
      lowStockThreshold: parseInt(formData.get('lowStockThreshold') as string),
    };

    setState(prev => {
      if (editingProduct) {
        return {
          ...prev,
          products: prev.products.map(p => p.id === editingProduct.id ? productData : p)
        };
      }
      return {
        ...prev,
        products: [...prev.products, productData]
      };
    });

    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const deleteProduct = (id: string) => {
    if (!isAdmin) return alert("Only admins can delete products.");
    if (confirm("Are you sure you want to delete this product?")) {
      setState(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== id)
      }));
    }
  };

  const filtered = state.products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.barcode.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products by name or barcode..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          {isAdmin && (
            <button 
              onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
              <th className="px-6 py-4">Product Info</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Price</th>
              <th className="px-6 py-4">Stock Status</th>
              {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-1">{p.barcode}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">{p.category}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</div>
                  <div className="text-[10px] text-gray-400">Cost: {CURRENCY_SYMBOL}{p.costPrice.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${p.stock <= p.lowStockThreshold ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
                    <span className="font-medium">{p.stock} in stock</span>
                  </div>
                  {p.stock <= p.lowStockThreshold && <div className="text-[10px] text-red-500 mt-1 uppercase font-bold tracking-tight">Low Stock Alert</div>}
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Product Name</label>
                  <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                  <input name="category" defaultValue={editingProduct?.category} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Barcode</label>
                  <input name="barcode" defaultValue={editingProduct?.barcode} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selling Price ({CURRENCY_SYMBOL})</label>
                  <input type="number" step="0.01" name="price" defaultValue={editingProduct?.price} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cost Price ({CURRENCY_SYMBOL})</label>
                  <input type="number" step="0.01" name="costPrice" defaultValue={editingProduct?.costPrice} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Stock Level</label>
                  <input type="number" name="stock" defaultValue={editingProduct?.stock} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Low Stock Alert at</label>
                  <input type="number" name="lowStockThreshold" defaultValue={editingProduct?.lowStockThreshold} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-6 flex space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border rounded-lg font-medium text-gray-500">Cancel</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
