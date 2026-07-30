import React, { useState } from 'react';
import { Settings, Volume2, VolumeX, Moon, Sun, Shield, Lock, RotateCcw, HardDrive, Trash2, CloudDownload, Sparkles, CheckCircle2 } from 'lucide-react';
import { AccessibilitySettings, UserProfile } from '../types';
import { soundFx } from '../lib/sound';
import { dbStore } from '../lib/storage';

interface SettingsModalProps {
  settings: AccessibilitySettings;
  onUpdateSettings: (settings: AccessibilitySettings) => void;
  user: UserProfile;
  onOpenLogin: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  user,
  onOpenLogin,
}) => {
  const [storageInfo, setStorageInfo] = useState(() => dbStore.getStorageUsageInfo());
  const [cleanNotice, setCleanNotice] = useState<string | null>(null);

  const toggleSound = () => {
    const newSound = !settings.soundEnabled;
    soundFx.enabled = newSound;
    if (newSound) soundFx.playPop();
    onUpdateSettings({ ...settings, soundEnabled: newSound });
  };

  const toggleTheme = () => {
    soundFx.playClick();
    onUpdateSettings({
      ...settings,
      theme: settings.theme === 'dark' ? 'light' : 'dark'
    });
  };

  const handleCleanCompletedImages = () => {
    soundFx.playClick();
    const result = dbStore.cleanOldestCompletedPuzzleImages();
    soundFx.playCorrect();
    setCleanNotice(result.message);
    setStorageInfo(dbStore.getStorageUsageInfo());
  };

  const handleResetProgress = () => {
    soundFx.playClick();
    if (confirm('Reset your player quiz progress? This will clear all completed question records.')) {
      dbStore.clearUserProgress();
      soundFx.playCorrect();
      alert('Progress reset.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="font-black text-3xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Settings & Storage</h2>
        <p className="text-xs text-slate-500 font-bold">Customize visual theme, audio, hybrid cloud/local storage, and cache cleanup.</p>
      </div>

      <div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        
        {/* Sound Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <div>
            <h4 className="font-black text-base text-slate-800 dark:text-slate-100">In-Game Sound Effects</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Play click, guess pop, victory chime, and hint audio.</p>
          </div>

          <button
            onClick={toggleSound}
            className={`p-3 rounded-2xl border transition-all ${
              settings.soundEnabled
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'
            }`}
          >
            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
          <div>
            <h4 className="font-black text-base text-slate-800 dark:text-slate-100">Visual Display Theme</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current mode: {settings.theme.toUpperCase()}</p>
          </div>

          <button
            onClick={toggleTheme}
            className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-amber-500 hover:text-amber-600 transition-colors"
          >
            {settings.theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        {/* Hybrid Storage & Smart Caching Card */}
        <div className="p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="font-black text-base text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Hybrid Cloud & Local Device Storage
              </h4>
              <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 font-medium leading-relaxed">
                Ships with basic starter pack <strong className="font-bold">World Animals</strong> locally. New puzzle packs are fetched on-demand from the cloud and cached for offline play.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-[10px] tracking-wide whitespace-nowrap shadow-xs">
              HYBRID ACTIVE
            </span>
          </div>

          {/* Storage Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase block">Device Storage</span>
              <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">{storageInfo.totalMB} MB</span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase block">Cached Packs</span>
              <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">{storageInfo.downloadedCount} Packs</span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase block">Completed Caches</span>
              <span className="font-black text-sm text-amber-600 dark:text-amber-400">{storageInfo.completedCount} Completed</span>
            </div>
          </div>

          {cleanNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span>{cleanNotice}</span>
            </div>
          )}

          {/* Storage Cleanup Action */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-indigo-200/60 dark:border-indigo-800/40">
            <div>
              <span className="font-black text-xs text-indigo-950 dark:text-indigo-200 block">Low Storage Cleanup</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Deletes oldest completed puzzle picture images while preserving all player progress, coins & stats.</span>
            </div>

            <button
              id="delete-oldest-completed-images-btn"
              onClick={handleCleanCompletedImages}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-200 dark:shadow-none whitespace-nowrap flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Oldest Completed Puzzle Images</span>
            </button>
          </div>
        </div>

        {/* Master Admin Portal Action */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-base text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              Master Administrator System
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {user.role === 'admin' ? 'You are logged in as Master Admin.' : 'Authenticate as Master Admin account.'}
            </p>
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onOpenLogin();
            }}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-200 dark:shadow-none whitespace-nowrap"
          >
            {user.role === 'admin' ? 'ADMIN ACTIVE' : 'AUTHENTICATE'}
          </button>
        </div>

        {/* Reset Progress */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-base text-rose-800 dark:text-rose-300">Reset Player Progress</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Clear completed questions history while keeping coins & level.</p>
          </div>

          <button
            onClick={handleResetProgress}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-xs whitespace-nowrap"
          >
            RESET PROGRESS
          </button>
        </div>

      </div>
    </div>
  );
};
