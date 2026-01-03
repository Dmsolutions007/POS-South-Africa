
import React, { useState, useRef } from 'react';
import { Plus, Search, Filter, Edit3, Trash2, Download, X, Package, Tag, Barcode, Upload, FileJson, Loader2 } from 'lucide-react';
import { AppState, Product, UserRole } from '../types';
import { CURRENCY_SYMBOL } from '../constants';
import * as XLSX from 'xlsx';

const Products = ({ state, setState }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>> }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const importedProducts: Product[] = data.map((item: any, idx: number) => ({
          id: `P-IMP-${Date.now()}-${idx}`,
          name: item.Name || item.name || 'Unnamed Product',
          category: item.Category || item.category || 'Uncategorized',
          barcode: String(item.Barcode || item.barcode || Math.random().toString().slice(2, 12)),
          price: parseFloat(item.Price || item.price || 0),
          costPrice: parseFloat(item['Cost Price'] || item.cost_price || item.cost || 0),
          stock: parseInt(item.Stock || item.stock || 0),
          lowStockThreshold: parseInt(item['Low Stock Limit'] || item.low_stock || 5),
        }));

        if (importedProducts.length > 0) {
          setState(prev => ({
            ...prev,
            products: [...prev.products, ...importedProducts]
          }));
          alert(`Successfully imported ${importedProducts.length} products.`);
        }
      } catch (error) {
        console.error("Import Error:", error);
        alert("Failed to parse CSV. Please ensure the file follows the correct format.");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
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
    p.barcode.includes(search) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name, category or barcode..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm transition-all text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleCSVImport} 
          />
          {isAdmin && (
            <>
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex-1 md:flex-none bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                <span className="text-sm">Import CSV</span>
              </button>
              <button 
                onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
                className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <Plus size={18} />
                <span className="text-sm">Add Product</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden lg:block bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
              <th className="px-6 py-4">Product Info</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Selling Price</th>
              <th className="px-6 py-4 text-center">In Stock</th>
              {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <Package size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 tracking-wider uppercase">{p.barcode}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase">{p.category}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="font-black text-slate-900">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Cost: {CURRENCY_SYMBOL}{p.costPrice.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${p.stock <= p.lowStockThreshold ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`}></span>
                       <span className={`font-black ${p.stock <= p.lowStockThreshold ? 'text-red-600' : 'text-slate-700'}`}>{p.stock}</span>
                    </div>
                    {p.stock <= p.lowStockThreshold && <span className="text-[8px] font-black text-red-500 uppercase mt-1">Low Stock</span>}
                  </div>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button 
                        onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

      {/* Mobile/Tablet View: Cards */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.stock <= p.lowStockThreshold ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Package size={24} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 leading-tight">{p.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">{CURRENCY_SYMBOL}{p.price.toFixed(2)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase">Barcode: {p.barcode}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.stock <= p.lowStockThreshold ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                  {p.stock} In Stock
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); }} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-200">
          <Package size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching products found</p>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <Tag size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{editingProduct ? 'Edit Item' : 'New Item'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Description</label>
                  <input name="name" defaultValue={editingProduct?.name} required placeholder="e.g. Fresh Milk 2L Full Cream" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium" />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                    <input name="category" defaultValue={editingProduct?.category} required placeholder="e.g. Dairy" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Barcode (EAN-13)</label>
                    <input name="barcode" defaultValue={editingProduct?.barcode} required placeholder="Scanning..." className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">Retail Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-black text-xs">{CURRENCY_SYMBOL}</span>
                      <input type="number" step="0.01" name="price" defaultValue={editingProduct?.price} required className="w-full pl-8 pr-4 py-3 bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-black text-blue-600" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest">Cost Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">{CURRENCY_SYMBOL}</span>
                      <input type="number" step="0.01" name="costPrice" defaultValue={editingProduct?.costPrice} required className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-500" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Opening Stock</label>
                    <input type="number" name="stock" defaultValue={editingProduct?.stock} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Low Stock Limit</label>
                    <input type="number" name="lowStockThreshold" defaultValue={editingProduct?.lowStockThreshold} required className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-red-500" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-[2] bg-blue-600 text-white px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                  {editingProduct ? 'Update Inventory' : 'Confirm & Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
