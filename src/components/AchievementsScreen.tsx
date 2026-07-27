import React, { useState } from 'react';
import { Trophy, CheckCircle2, Lock, Coins, Sparkles } from 'lucide-react';
import { Achievement, UserProfile } from '../types';
import { dbStore } from '../lib/storage';
import { soundFx } from '../lib/sound';

interface AchievementsScreenProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  user,
  onUpdateUser,
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>(() => dbStore.getAchievements());

  const handleClaim = (ach: Achievement) => {
    soundFx.playCorrect();
    dbStore.claimAchievementReward(ach.id);
    onUpdateUser({
      ...user,
      coins: user.coins + ach.coinReward,
      xp: user.xp + ach.xpReward
    });
    setAchievements(dbStore.getAchievements());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-3xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Achievements & Trophies</h2>
        <p className="text-xs text-slate-500 font-bold">Unlock trophies as you solve pictures and master trivia packs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={`p-6 rounded-[28px] border-2 transition-all space-y-4 ${
              a.unlocked
                ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800 shadow-xs'
                : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-3xl p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40">
                {a.icon}
              </div>

              {a.claimed ? (
                <span className="px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Claimed
                </span>
              ) : a.unlocked ? (
                <button
                  onClick={() => handleClaim(a)}
                  className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-200 dark:shadow-none"
                >
                  CLAIM REWARD
                </button>
              ) : (
                <span className="px-3.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Locked
                </span>
              )}
            </div>

            <div>
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100">{a.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">{a.description}</p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Progress</span>
                <span>{a.progress} / {a.maxProgress}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, (a.progress / a.maxProgress) * 100)}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-xs font-bold">
              <span className="text-amber-600 dark:text-amber-400 font-black">🪙 +{a.coinReward} Coins</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-black">⚡ +{a.xpReward} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
