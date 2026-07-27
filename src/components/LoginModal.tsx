import React, { useState } from 'react';
import { X, Shield, User, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound, ExternalLink } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
import { loginMasterAdminWithGoogle, loginMasterAdminDirect, MASTER_ADMIN_EMAIL } from '../lib/firebase';
import { UserProfile } from '../types';
import { soundFx } from '../lib/sound';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserProfile) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
}) => {
  if (!isOpen) return null;

  const [mode, setMode] = useState<'login' | 'admin'>('login');
  const [username, setUsername] = useState('');
  const [adminDirectEmail, setAdminDirectEmail] = useState(MASTER_ADMIN_EMAIL);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDirectInput, setShowDirectInput] = useState(false);

  const handleLoginPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setLoading(true);
    setErrorMessage(null);

    const user = await apiClient.loginUser(username || 'PlayerOne');
    setLoading(false);
    if (user) {
      soundFx.playCorrect();
      onSuccessLogin(user);
      onClose();
    }
  };

  const handleLoginMasterAdminGoogle = async () => {
    soundFx.playClick();
    setLoading(true);
    setErrorMessage(null);

    const res = await loginMasterAdminWithGoogle();
    setLoading(false);

    if (res.success && res.user) {
      soundFx.playCorrect();
      onSuccessLogin(res.user);
      onClose();
    } else {
      soundFx.playWrong();
      setErrorMessage(res.message || 'Google account validation failed.');
      if (res.isUnauthorizedDomain) {
        setShowDirectInput(true);
      }
    }
  };

  const handleLoginDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setLoading(true);
    setErrorMessage(null);

    const res = await loginMasterAdminDirect(adminDirectEmail);
    setLoading(false);

    if (res.success && res.user) {
      soundFx.playCorrect();
      onSuccessLogin(res.user);
      onClose();
    } else {
      soundFx.playWrong();
      setErrorMessage(res.message || 'Direct email validation failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => {
          soundFx.playClick();
          onClose();
        }}
      />

      {/* Modal Box */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-2xl z-10 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 p-0.5 shadow-sm">
              <div className="w-full h-full bg-indigo-600 rounded-[14px] flex items-center justify-center font-black text-amber-300 text-sm">
                100
              </div>
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">Account Access</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Player Switch or Google Master Admin</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-black">
          <button
            onClick={() => { setErrorMessage(null); setMode('login'); }}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'login' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Standard Player
          </button>
          <button
            onClick={() => { setErrorMessage(null); setMode('admin'); }}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'admin' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Master Admin</span>
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800/80 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm text-rose-900 dark:text-rose-100 mb-0.5">Authentication Restricted</div>
              <p className="leading-relaxed font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLoginPlayer} className="space-y-4">
            <div>
              <label className="font-black text-xs text-slate-700 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">Player Username</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Enter username (e.g. PuzzlePro)..."
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <span>LOGIN / START PLAYING</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs space-y-2 text-left">
              <div className="font-black flex items-center justify-between text-amber-900 dark:text-amber-300 text-sm">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Master Admin Login
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 text-[10px] font-black uppercase">
                  RESTRICTED
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                Only <strong className="text-slate-900 dark:text-white font-black">{MASTER_ADMIN_EMAIL}</strong> is authorized to sign in as Master Administrator. Firebase account validation is enforced.
              </p>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleLoginMasterAdminGoogle}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.99] border border-amber-300"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>{loading ? 'VALIDATING GOOGLE ACCOUNT...' : 'SIGN IN WITH GOOGLE ADMIN'}</span>
            </button>

            {/* Direct Authorized Email Login Toggle / Form */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-left">
              {!showDirectInput ? (
                <button
                  type="button"
                  onClick={() => setShowDirectInput(true)}
                  className="w-full py-2.5 text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold text-center flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Verify Authorized Admin Account Email Directly</span>
                </button>
              ) : (
                <form onSubmit={handleLoginDirect} className="space-y-3 pt-1 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Authorized Admin Email
                    </label>
                    <span className="text-[10px] text-amber-600 font-extrabold uppercase">Firebase Store Validated</span>
                  </div>
                  <input
                    type="email"
                    required
                    value={adminDirectEmail}
                    onChange={e => setAdminDirectEmail(e.target.value)}
                    placeholder="garrydavies1963@gmail.com"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border-2 border-amber-500/40 text-slate-900 dark:text-slate-100 text-sm font-black focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <Shield className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                    <span>VERIFY & LOGIN ADMIN</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

