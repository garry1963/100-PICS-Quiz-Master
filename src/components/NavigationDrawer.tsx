import React, { useState } from 'react';
import {
  X,
  Home,
  Grid,
  CalendarCheck,
  Trophy,
  BarChart2,
  Settings,
  Shield,
  UserCheck,
  LogOut,
  Sparkles,
  Download,
  Flame,
  CheckCircle2,
  Lock,
  EyeOff,
  Crown
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundFx } from '../lib/sound';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onSwitchAccount: () => void;
  onLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  user,
  activeTab,
  onSelectTab,
  onSwitchAccount,
  onLogout,
}) => {
  if (!isOpen) return null;

  const handleNav = (tab: string) => {
    soundFx.playClick();
    onSelectTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => {
          soundFx.playClick();
          onClose();
        }}
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none text-white font-black text-sm">
              100
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tight text-slate-800 dark:text-white">100 PICS</h2>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">Picture Trivia Master</p>
            </div>
          </div>

          <button
            id="close-drawer-btn"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3">
          <img
            src={user.avatar}
            alt={user.username}
            className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-200 dark:border-indigo-700"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 truncate">{user.username}</h3>
              {user.role === 'admin' && (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 font-black text-[9px]">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{user.title}</p>
            <div className="flex items-center gap-3 mt-1 text-[11px] font-black">
              <span className="text-amber-600 dark:text-amber-400">🪙 {user.coins} Coins</span>
              <span className="text-indigo-600 dark:text-indigo-400">⚡ LVL {user.level}</span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          <button
            id="nav-home-btn"
            onClick={() => handleNav('home')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'home'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            id="nav-categories-btn"
            onClick={() => handleNav('categories')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'categories'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>Categories</span>
          </button>

          <button
            id="nav-hidden-image-btn"
            onClick={() => handleNav('hidden-image')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'hidden-image'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <EyeOff className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div className="flex-1 flex items-center justify-between">
              <span>Hidden Image</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-black">
                NEW PUZZLE
              </span>
            </div>
          </button>

          <button
            id="nav-challenges-btn"
            onClick={() => handleNav('challenges')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'challenges'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <div className="flex-1 flex items-center justify-between">
              <span>Daily Challenge</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold">
                REWARDS
              </span>
            </div>
          </button>

          <button
            id="nav-leaderboard-btn"
            onClick={() => handleNav('leaderboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Crown className="w-5 h-5 text-amber-500" />
            <div className="flex-1 flex items-center justify-between">
              <span>Leaderboard</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                GLOBAL
              </span>
            </div>
          </button>

          <button
            id="nav-achievements-btn"
            onClick={() => handleNav('achievements')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'achievements'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Achievements</span>
          </button>

          <button
            id="nav-stats-btn"
            onClick={() => handleNav('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'stats'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span>Statistics</span>
          </button>

          <button
            id="nav-settings-btn"
            onClick={() => handleNav('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-colors ${
              activeTab === 'settings'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>

          {/* Master Administrator Console Callout */}
          <div className="pt-4 mt-2">
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-100 dark:border-rose-900/40">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black mb-1 text-sm">
                <Shield className="w-4 h-4" />
                <span>Admin Console</span>
              </div>
              <p className="text-xs text-rose-500 dark:text-rose-300 font-medium leading-relaxed">
                {user.role === 'admin'
                  ? 'Access full quiz engine management & user logs.'
                  : 'Authenticate as Master Admin account.'}
              </p>
              <button
                id="drawer-admin-action-btn"
                onClick={() => {
                  soundFx.playClick();
                  if (user.role === 'admin') {
                    handleNav('admin');
                  } else {
                    onSwitchAccount();
                    onClose();
                  }
                }}
                className="mt-3 w-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black py-2.5 rounded-xl shadow-lg shadow-rose-200 dark:shadow-none transition-all"
              >
                {user.role === 'admin' ? 'Enter Admin Dashboard' : 'Master Login'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            id="drawer-switch-account-btn"
            onClick={() => {
              soundFx.playClick();
              onSwitchAccount();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Switch Account</span>
          </button>

          <button
            id="drawer-logout-btn"
            onClick={() => {
              soundFx.playClick();
              onLogout();
              onClose();
            }}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
