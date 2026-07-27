import React from 'react';
import { Settings, Volume2, VolumeX, Moon, Sun, Shield, Lock, RotateCcw } from 'lucide-react';
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
        <h2 className="font-black text-3xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Settings & Preferences</h2>
        <p className="text-xs text-slate-500 font-bold">Customize visual theme, audio, and player preferences.</p>
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
