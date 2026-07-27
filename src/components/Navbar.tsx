import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Coins,
  Shield,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Menu,
  X,
  Trophy,
  UserCheck
} from 'lucide-react';
import { UserProfile, AccessibilitySettings } from '../types';
import { soundFx } from '../lib/sound';

interface NavbarProps {
  user: UserProfile;
  settings: AccessibilitySettings;
  onUpdateSettings: (settings: AccessibilitySettings) => void;
  onOpenDrawer: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  onNavigateHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  onUpdateSettings,
  onOpenDrawer,
  onOpenAdmin,
  onOpenProfile,
  onOpenSearch,
  onNavigateHome,
}) => {
  const toggleTheme = () => {
    soundFx.playClick();
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ ...settings, theme: newTheme });
  };

  const toggleSound = () => {
    const newSound = !settings.soundEnabled;
    soundFx.enabled = newSound;
    if (newSound) soundFx.playPop();
    onUpdateSettings({ ...settings, soundEnabled: newSound });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Left: Menu & Brand Logo */}
        <div className="flex items-center gap-4">
          <button
            id="nav-drawer-toggle-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenDrawer();
            }}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => {
              soundFx.playClick();
              onNavigateHome();
            }}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover:scale-105">
              <span className="font-black text-white text-base tracking-tighter">100</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-black text-2xl tracking-tight text-slate-800 dark:text-white">
                100 PICS
                <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg uppercase">
                  TRIVIA
                </span>
                <span className="hidden lg:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg uppercase" title="Firebase Firestore Database Active">
                  🔥 FIRESTORE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Trigger Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            id="search-trigger-bar"
            onClick={() => {
              soundFx.playClick();
              onOpenSearch();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-400 text-sm font-medium transition-all text-left"
          >
            <Search className="w-5 h-5 text-indigo-500" />
            <span className="truncate">Search 100+ quiz packs, categories, keywords...</span>
          </button>
        </div>

        {/* Right: Coins, Level, Profile, Master Admin & Settings Toggles */}
        <div className="flex items-center gap-3">
          {/* Search button mobile */}
          <button
            id="search-mobile-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenSearch();
            }}
            className="md:hidden p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Search Quizzes"
          >
            <Search className="w-5 h-5 text-indigo-500" />
          </button>

          {/* Master Admin Badge (If Admin) */}
          {user.role === 'admin' && (
            <button
              id="master-admin-badge-btn"
              onClick={() => {
                soundFx.playClick();
                onOpenAdmin();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-200 dark:shadow-none transition-all"
              title="Open Master Administrator Dashboard"
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">ADMIN</span>
            </button>
          )}

          {/* Coins Counter Pill */}
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-4 py-2 rounded-full border border-amber-200 dark:border-amber-800/60 font-black text-sm select-none">
            <Coins className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-base">{user.coins.toLocaleString()}</span>
          </div>

          {/* XP Level Pill */}
          <div className="hidden sm:flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full border border-indigo-200 dark:border-indigo-800/60 select-none">
            <span className="font-bold text-xs uppercase tracking-wider">Lvl {user.level}</span>
            <div className="w-16 h-2 bg-indigo-200 dark:bg-indigo-900 rounded-full overflow-hidden">
              <div className="w-3/4 h-full bg-indigo-600" />
            </div>
          </div>

          {/* Sound Toggle */}
          <button
            id="nav-sound-toggle"
            onClick={toggleSound}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title={settings.soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {/* Profile Avatar Button */}
          <button
            id="nav-profile-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenProfile();
            }}
            className="flex items-center gap-2 p-0.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 transition-all"
            title="View Profile & Stats"
          >
            <img
              src={user.avatar}
              alt={user.username}
              className="w-9 h-9 rounded-xl object-cover"
            />
          </button>
        </div>

      </div>
    </header>
  );
};
