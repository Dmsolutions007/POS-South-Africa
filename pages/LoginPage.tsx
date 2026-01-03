import React, { useState } from 'react';
import { ShieldCheck, User as UserIcon, Lock, AlertCircle, Loader2, Zap } from 'lucide-react';
import { APP_NAME, SLOGAN } from '../constants';
import { authenticate } from '../store';
import { CONFIG } from '../services/config';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    setTimeout(() => {
      const user = authenticate(username);
      const isPasswordValid = password === username || password === '1234';

      if (user && isPasswordValid) {
        onLogin(username);
      } else {
        setError("Invalid Terminal ID or Access PIN.");
        setIsLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      {/* Background Layer Shared with App */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=85&w=2400")' }}
      >
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[6px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10 space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.4)] mb-4 rotate-3 transform transition-transform hover:rotate-0 duration-500 group">
            <Zap className="text-white group-hover:scale-125 transition-transform" size={48} fill="white" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">{APP_NAME}</h1>
            <p className="text-blue-500 font-black tracking-[0.3em] uppercase text-[10px]">{SLOGAN}</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          
          {error && (
            <div className="mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-300 animate-in slide-in-from-top-4">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-widest leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Terminal Identity</label>
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 text-white rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-700 font-bold text-sm tracking-wide"
                  placeholder="e.g. admin"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Access Control Pin</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/40 border border-white/5 text-white rounded-2xl pl-14 pr-6 py-5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-700 font-bold text-sm"
                  placeholder="••••••••"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-600/30 active:scale-95 flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-xs mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Unlocking...</span>
                </>
              ) : (
                <>
                  <span>Unlock Register</span>
                  <ShieldCheck size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/5 text-center space-y-6">
            <div className="flex items-center justify-center gap-4">
               <div className="h-px bg-white/5 flex-1"></div>
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Secure Auth</span>
               <div className="h-px bg-white/5 flex-1"></div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Mzansi-Edge POS v{CONFIG.APP.VERSION}</p>
              <p className="text-[9px] text-slate-700 font-bold uppercase tracking-tighter">Enterprise Retail Mirroring Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
