import React from 'react';
import { BarChart2, CheckCircle2, Flame, Coins, Trophy, Clock, Star, Zap } from 'lucide-react';
import { UserProfile } from '../types';

interface StatisticsScreenProps {
  user: UserProfile;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ user }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-3xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Personal Statistics</h2>
        <p className="text-xs text-slate-500 font-bold">Detailed performance metrics, accuracy, and streak logs.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-extrabold block">Total Solved</span>
          <span className="font-black text-3xl text-emerald-600 dark:text-emerald-400">124 Pics</span>
          <span className="text-[11px] text-slate-400 font-bold block">Across 12 Quiz Packs</span>
        </div>

        <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-extrabold block">Accuracy %</span>
          <span className="font-black text-3xl text-indigo-600 dark:text-indigo-400">94.8%</span>
          <span className="text-[11px] text-indigo-600/80 dark:text-indigo-300 font-bold block">First-try guesses</span>
        </div>

        <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-extrabold block">Active Streak</span>
          <span className="font-black text-3xl text-amber-500 flex items-center gap-1">
            <Flame className="w-6 h-6 fill-amber-500" />
            {user.currentStreak} Days
          </span>
          <span className="text-[11px] text-amber-600/80 dark:text-amber-300 font-bold block">Record: {user.longestStreak} days</span>
        </div>

        <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-extrabold block">Total Coins</span>
          <span className="font-black text-3xl text-amber-500">🪙 {user.coins}</span>
          <span className="text-[11px] text-slate-400 font-bold block">In-game balance</span>
        </div>
      </div>

      <div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-5">
        <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 uppercase tracking-tight">Level Progression & Rank Title</h3>
        <div className="flex items-center gap-4">
          <div className="px-5 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-black text-2xl">
            LVL {user.level}
          </div>
          <div>
            <h4 className="font-black text-xl text-slate-900 dark:text-white">{user.title}</h4>
            <p className="text-xs text-slate-500 font-bold">Current XP: {user.xp} XP / Next level at {(user.level + 1) * 100} XP</p>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full"
            style={{ width: `${(user.xp % 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
