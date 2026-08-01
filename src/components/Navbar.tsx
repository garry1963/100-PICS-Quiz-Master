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
  UserCheck,
  Tablet,
  Monitor
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
  tabletViewMode: 'portrait' | 'landscape' | 'fluid';
  onToggleTabletMode: (mode: 'portrait' | 'landscape' | 'fluid') => void;
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
  tabletViewMode,
  onToggleTabletMode,
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
    <header className="w-full sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xs transition-colors overflow-x-hidden">
      <div className="w-full max-w-full mx-auto px-3 sm:px-4 lg:px-6 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-3 box-border overflow-hidden">
        
        {/* Left: Menu & Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            id="nav-drawer-toggle-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenDrawer();
            }}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
            title="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => {
              soundFx.playClick();
              onNavigateHome();
            }}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transition-transform group-hover:scale-105 shrink-0">
              <span className="font-black text-white text-sm sm:text-base tracking-tighter">100</span>
            </div>
            <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-tight text-slate-800 dark:text-white shrink-0">
              100 PICS
              <span className="hidden sm:inline-block text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-md uppercase">
                TRIVIA
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search Trigger Bar (Only on wider screens) */}
        <div className="hidden xl:flex flex-1 max-w-sm mx-2 min-w-0">
          <button
            id="search-trigger-bar"
            onClick={() => {
              soundFx.playClick();
              onOpenSearch();
            }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 text-slate-400 text-xs font-medium transition-all text-left truncate"
          >
            <Search className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="truncate">Search 100+ quiz packs...</span>
          </button>
        </div>

        {/* Right: Coins, Level, Tablet Orientation Lock & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Search Button for non-XL screens */}
          <button
            id="search-mobile-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenSearch();
            }}
            className="xl:hidden p-2 sm:p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0"
            title="Search Quizzes"
          >
            <Search className="w-4 h-4 text-indigo-500" />
          </button>

          {/* Master Admin Badge (If Admin) */}
          {user.role === 'admin' && (
            <button
              id="master-admin-badge-btn"
              onClick={() => {
                soundFx.playClick();
                onOpenAdmin();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all shrink-0"
              title="Open Master Administrator Dashboard"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">ADMIN</span>
            </button>
          )}

          {/* Coins Counter Pill */}
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2.5 sm:px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800/60 font-black text-xs select-none shrink-0">
            <Coins className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span>{user.coins.toLocaleString()}</span>
          </div>

          {/* XP Level Pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800/60 select-none shrink-0">
            <span className="font-bold text-[11px] uppercase tracking-wider">Lvl {user.level}</span>
          </div>

          {/* Tablet Orientation Mode Lock Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-0.5 sm:p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 shrink-0">
            <button
              id="tablet-mode-portrait-btn"
              onClick={() => {
                soundFx.playClick();
                onToggleTabletMode('portrait');
              }}
              className={`p-1.5 rounded-xl transition-all ${
                tabletViewMode === 'portrait'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Lock Tablet Portrait Orientation Screen (768px)"
            >
              <Tablet className="w-4 h-4 rotate-90" />
            </button>
            <button
              id="tablet-mode-landscape-btn"
              onClick={() => {
                soundFx.playClick();
                onToggleTabletMode('landscape');
              }}
              className={`p-1.5 rounded-xl transition-all ${
                tabletViewMode === 'landscape'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Lock Tablet Landscape Orientation Screen (1024px)"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              id="tablet-mode-fluid-btn"
              onClick={() => {
                soundFx.playClick();
                onToggleTabletMode('fluid');
              }}
              className={`p-1.5 rounded-xl transition-all ${
                tabletViewMode === 'fluid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Fluid Fullscreen View"
            >
              <Monitor className="w-4 h-4" />
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            id="nav-sound-toggle"
            onClick={toggleSound}
            className="p-2 sm:p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title={settings.soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Profile Avatar Button */}
          <button
            id="nav-profile-btn"
            onClick={() => {
              soundFx.playClick();
              onOpenProfile();
            }}
            className="flex items-center gap-2 p-0.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 transition-all shrink-0"
            title="View Profile & Stats"
          >
            <img
              src={user.avatar}
              alt={user.username}
              className="w-8 h-8 rounded-xl object-cover"
            />
          </button>
        </div>

      </div>
    </header>
  );
};
