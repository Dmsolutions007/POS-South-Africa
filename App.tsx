
import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  LogOut, 
  Menu, 
  Bell,
  Zap
} from 'lucide-react';
import { loadState, saveState, authenticate } from './store';
import { AppState } from './types';
import { APP_NAME } from './constants';

// Pages
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import LoginPage from './pages/LoginPage';
import FlashServices from './pages/FlashServices';

const SidebarLink = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link 
    to={to} 
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const AppLayout = ({ state, setState, logout }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, logout: () => void }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const lowStockCount = useMemo(() => 
    state.products.filter(p => p.stock <= p.lowStockThreshold).length, 
  [state.products]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className={`bg-slate-900 w-64 flex-shrink-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:static h-full z-50`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">M</div>
            <h1 className="text-xl font-bold text-white tracking-tight">{APP_NAME}</h1>
          </div>
          
          <nav className="flex-1 px-4 space-y-2 overflow-y-auto mt-4">
            <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" active={location.pathname === '/dashboard'} />
            <SidebarLink to="/pos" icon={ShoppingCart} label="Point of Sale" active={location.pathname === '/pos'} />
            <SidebarLink to="/vas" icon={Zap} label="Flash Services" active={location.pathname === '/vas'} />
            <SidebarLink to="/products" icon={Package} label="Inventory" active={location.pathname === '/products'} />
            <SidebarLink to="/customers" icon={Users} label="Customers" active={location.pathname === '/customers'} />
            <SidebarLink to="/reports" icon={BarChart3} label="Reports" active={location.pathname === '/reports'} />
          </nav>

          <div className="p-4 border-t border-gray-800">
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-gray-400 hover:bg-red-900/20 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Log out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white border-b h-16 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden mr-4 text-gray-500">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {location.pathname.replace('/', '') || 'Dashboard'}
            </h2>
          </div>
          <Bell size={20} className="text-gray-400" />
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/dashboard" element={<Dashboard state={state} />} />
            <Route path="/pos" element={<POS state={state} setState={setState} />} />
            <Route path="/vas" element={<FlashServices state={state} setState={setState} />} />
            <Route path="/products" element={<Products state={state} setState={setState} />} />
            <Route path="/customers" element={<Customers state={state} setState={setState} />} />
            <Route path="/reports" element={<Reports state={state} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [state, setState] = useState<AppState>(loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const handleLogin = (username: string) => {
    const user = authenticate(username);
    if (user) setState(prev => ({ ...prev, currentUser: user }));
    // Validation alert removed as LoginPage handles it locally now
  };

  if (!state.currentUser) return <LoginPage onLogin={handleLogin} />;

  return (
    <Router>
      <AppLayout state={state} setState={setState} logout={() => setState(p => ({...p, currentUser: null}))} />
    </Router>
  );
};

export default App;
