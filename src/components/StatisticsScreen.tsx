import React from 'react';
import { Flame, Trash2, RotateCcw } from 'lucide-react';
import { UserProfile, QuestionAnswerState } from '../types';
import { dbStore } from '../lib/storage';
import { soundFx } from '../lib/sound';

interface StatisticsScreenProps {
  user: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
}

export const StatisticsScreen: React.FC<StatisticsScreenProps> = ({ user, onUpdateUser }) => {
  // Calculate real metrics from user's actual progress
  const allProgress = dbStore.getAllProgress();
  let totalSolvedPics = 0;
  let activePacksCount = 0;

  Object.values(allProgress).forEach((prog) => {
    if (prog.completedQuestions && prog.completedQuestions.length > 0) {
      totalSolvedPics += prog.completedQuestions.length;
      activePacksCount++;
    }
  });

  // Calculate real accuracy from stored question answer states
  const answerStates = dbStore.getAllAnswerStates();
  const answersList = Object.values(answerStates);
  let totalAttempts = 0;
  let correctSolves = 0;

  answersList.forEach((a) => {
    totalAttempts++;
    if (a.guessedCorrectly) {
      correctSolves++;
    }
  });

  const accuracyPct = totalAttempts > 0 ? ((correctSolves / totalAttempts) * 100).toFixed(1) : '0.0';

  const handleClearPersonalStats = () => {
    soundFx.playClick();
    const confirmed = confirm('Are you sure you want to clear your Personal Statistics, gameplay progress, and accuracy records? This action cannot be undone.');
    if (!confirmed) return;

    const resetUser = dbStore.clearPersonalStats(user);
    if (onUpdateUser) {
      onUpdateUser(resetUser);
    }
    soundFx.playCorrect();
    alert('Personal statistics and gameplay progress have been cleared.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Personal Statistics</h2>
          <p className="text-xs text-slate-500 font-bold">Real-time performance metrics, solved pictures, accuracy, and streak logs.</p>
        </div>

        {/* Clear Personal Statistics Option */}
        <button
          onClick={handleClearPersonalStats}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-black transition-all cursor-pointer self-start sm:self-auto"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Personal Statistics</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-extrabold block">Total Solved</span>
          <span className="font-black text-3xl text-emerald-600 dark:text-emerald-400">{totalSolvedPics} Pics</span>
          <span className="text-[11px] text-slate-400 font-bold block">
            {activePacksCount === 0 ? 'No packs completed yet' : `Across ${activePacksCount} Quiz ${activePacksCount === 1 ? 'Pack' : 'Packs'}`}
          </span>
        </div>

        <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-extrabold block">Accuracy %</span>
          <span className="font-black text-3xl text-indigo-600 dark:text-indigo-400">{accuracyPct}%</span>
          <span className="text-[11px] text-indigo-600/80 dark:text-indigo-300 font-bold block">
            {totalAttempts === 0 ? 'No attempts recorded' : 'Real accuracy rate'}
          </span>
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
