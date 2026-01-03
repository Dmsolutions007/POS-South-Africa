
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
  Zap,
  Wifi,
  WifiOff,
  CloudCheck
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
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const AppLayout = ({ state, setState, logout }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, logout: () => void }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-slate-950 w-64 flex-shrink-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 absolute md:static h-full z-50 border-r border-slate-900`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Zap size={24} fill="white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white tracking-tight leading-none">Mzansi-Edge</h1>
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Enterprise POS</span>
              </div>
            </div>
            
            <nav className="space-y-1.5">
              <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Overview" active={location.pathname === '/dashboard'} />
              <SidebarLink to="/pos" icon={ShoppingCart} label="Register" active={location.pathname === '/pos'} />
              <SidebarLink to="/vas" icon={Zap} label="VAS / Flash" active={location.pathname === '/vas'} />
              <SidebarLink to="/products" icon={Package} label="Inventory" active={location.pathname === '/products'} />
              <SidebarLink to="/customers" icon={Users} label="Customers" active={location.pathname === '/customers'} />
              <SidebarLink to="/reports" icon={BarChart3} label="Analytics" active={location.pathname === '/reports'} />
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-4">
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Local Database</p>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
              <p className="text-xs text-slate-400 font-medium">Auto-sync active. {state.sales.length} records mirrored.</p>
            </div>
            
            <button 
              onClick={logout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm"
            >
              <LogOut size={18} />
              <span>Lock Terminal</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b h-16 flex items-center justify-between px-6 flex-shrink-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                {location.pathname.replace('/', '') || 'Overview'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Hosting Environment Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${isOnline ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'}`}>
              {isOnline ? (
                <><Wifi size={12} /><span>Cloud Connected</span></>
              ) : (
                <><WifiOff size={12} /><span>Offline Mode</span></>
              )}
            </div>
            
            <div className="h-8 w-px bg-slate-200"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{state.currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{state.currentUser?.role}</p>
              </div>
              <div className="w-10 h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-400">
                <Users size={20} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
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
  };

  if (!state.currentUser) return <LoginPage onLogin={handleLogin} />;

  return (
    <Router>
      <AppLayout state={state} setState={setState} logout={() => setState(p => ({...p, currentUser: null}))} />
    </Router>
  );
};

export default App;
