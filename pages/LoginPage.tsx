
import React, { useState } from 'react';
import { ShieldCheck, User as UserIcon, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { APP_NAME, SLOGAN } from '../constants';
import { authenticate } from '../store';

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

    // Simulated network delay for professional feel
    setTimeout(() => {
      const user = authenticate(username);
      
      // Demo logic: Password must match username or be '1234'
      const isPasswordValid = password === username || password === '1234';

      if (user && isPasswordValid) {
        onLogin(username);
      } else {
        setError("Wrong username or password, please try again");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px]"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/30 mb-6 rotate-3">
            <ShieldCheck className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">{APP_NAME}</h1>
          <p className="text-slate-400 font-medium tracking-wide uppercase text-xs">{SLOGAN}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-800 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Terminal ID / Username</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-700 font-medium"
                  placeholder="admin or cashier"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Access PIN / Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-700 font-medium"
                  placeholder="••••••••"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-widest text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Enter Terminal</span>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center space-y-4">
            <div className="flex items-center justify-center gap-4">
               <div className="h-px bg-slate-800 flex-1"></div>
               <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">Certified Retail Tech</span>
               <div className="h-px bg-slate-800 flex-1"></div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Mzansi-Edge POS Terminal v2.4.0
              <br />
              <span className="text-slate-600">Secure Offline-First Deployment • Johannesburg, ZA</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
