
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
  X,
  Bell,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { loadState, saveState, authenticate } from './store';
import { AppState } from './types';
import { CONFIG } from './services/config';

// Pages
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import LoginPage from './pages/LoginPage';
import FlashServices from './pages/FlashServices';

const SidebarLink = ({ to, icon: Icon, label, active, onClick }: { to: string, icon: any, label: string, active: boolean, onClick?: () => void }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const AppLayout = ({ state, setState, logout }: { state: AppState, setState: React.Dispatch<React.SetStateAction<AppState>>, logout: () => void }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`bg-slate-950 w-64 flex-shrink-0 transition-transform duration-300 ease-in-out fixed md:static h-full z-[70] border-r border-slate-900 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Zap size={24} fill="white" />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white tracking-tight leading-none">Mzansi-Edge</h1>
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest text-nowrap">v{CONFIG.APP.VERSION}</span>
                </div>
              </div>
              <button onClick={closeSidebar} className="md:hidden text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <nav className="space-y-1.5">
              <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Overview" active={location.pathname === '/dashboard'} onClick={closeSidebar} />
              <SidebarLink to="/pos" icon={ShoppingCart} label="Register" active={location.pathname === '/pos'} onClick={closeSidebar} />
              <SidebarLink to="/vas" icon={Zap} label="VAS / Flash" active={location.pathname === '/vas'} onClick={closeSidebar} />
              <SidebarLink to="/products" icon={Package} label="Inventory" active={location.pathname === '/products'} onClick={closeSidebar} />
              <SidebarLink to="/customers" icon={Users} label="Customers" active={location.pathname === '/customers'} onClick={closeSidebar} />
              <SidebarLink to="/reports" icon={BarChart3} label="Analytics" active={location.pathname === '/reports'} onClick={closeSidebar} />
            </nav>
          </div>

          <div className="mt-auto p-6 space-y-4">
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase">System Integrity</p>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`}></div>
              </div>
              <p className="text-[8px] sm:text-xs text-slate-400 font-medium">{isOnline ? 'Cloud sync active.' : 'Offline mode active.'}</p>
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="bg-white/90 backdrop-blur-md border-b h-16 flex items-center justify-between px-4 md:px-6 flex-shrink-0 z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <Menu size={20} />
            </button>
            <h2 className="text-[10px] md:text-sm font-bold text-slate-900 uppercase tracking-widest truncate">
              {location.pathname.replace('/', '') || 'Overview'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-tighter transition-all ${isOnline ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100 animate-pulse'}`}>
              {isOnline ? (
                <><Wifi size={10} className="hidden sm:inline" /><span>Online</span></>
              ) : (
                <><WifiOff size={10} className="hidden sm:inline" /><span>Offline</span></>
              )}
            </div>
            
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            
            <div className="flex items-center gap-2 md:gap-3">
              <div className="text-right hidden lg:block">
                <p className="text-xs font-bold text-slate-900">{state.currentUser?.fullName}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{state.currentUser?.role}</p>
              </div>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-slate-400">
                <Users size={16} />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8">
          <div className="max-w-7xl mx-auto pb-10">
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
