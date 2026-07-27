import React, { useState } from 'react';
import { X, Shield, User, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../lib/apiClient';
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
  const [loading, setLoading] = useState(false);

  const handleLoginPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    setLoading(true);

    const user = await apiClient.loginUser(username || 'PlayerOne');
    setLoading(false);
    if (user) {
      soundFx.playCorrect();
      onSuccessLogin(user);
      onClose();
    }
  };

  const handleLoginMasterAdmin = async () => {
    soundFx.playClick();
    setLoading(true);

    const user = await apiClient.loginUser('admin');
    setLoading(false);
    if (user) {
      soundFx.playCorrect();
      onSuccessLogin(user);
      onClose();
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
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Switch user or login as Master Admin</p>
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
            onClick={() => setMode('login')}
            className={`py-2.5 rounded-xl transition-all ${
              mode === 'login' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Standard Player
          </button>
          <button
            onClick={() => setMode('admin')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'admin' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Master Admin</span>
          </button>
        </div>

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
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 text-xs space-y-1 text-left">
              <div className="font-black flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-sm">
                <Shield className="w-4 h-4" />
                <span>1 Master Administrator Account</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Grants unrestricted access to full Quiz Pack creation, AI Generator, User Management, Database Backup, and Audit Logs.
              </p>
            </div>

            <button
              onClick={handleLoginMasterAdmin}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Shield className="w-5 h-5" />
              <span>AUTHENTICATE AS MASTER ADMIN</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
