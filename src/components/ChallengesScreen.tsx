import React, { useState, useEffect } from 'react';
import {
  Flame,
  Trophy,
  Coins,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Target,
  EyeOff,
  ArrowRight,
  Gift,
  Calendar,
  Award,
  ChevronRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundFx } from '../lib/sound';
import { dbStore } from '../lib/storage';

interface ChallengesScreenProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onNavigateTab?: (tab: string) => void;
  onPlayPackDirect?: (packId: string) => void;
}

interface ChallengeItem {
  id: string;
  type: 'daily' | 'weekly';
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  rewardCoins: number;
  rewardXP: number;
  iconName: 'Flame' | 'Trophy' | 'Target' | 'Zap' | 'EyeOff' | 'Star' | 'Gift';
  category?: string;
  actionType: 'play_pack' | 'hidden_image' | 'browse';
  actionPackId?: string;
}

const DAILY_CHALLENGES_DATA: ChallengeItem[] = [
  {
    id: 'daily_sprint',
    type: 'daily',
    title: 'Daily Picture Sprint',
    description: 'Solve 5 picture trivia questions across any quiz pack today.',
    targetCount: 5,
    currentCount: 3,
    rewardCoins: 150,
    rewardXP: 250,
    iconName: 'Flame',
    actionType: 'browse'
  },
  {
    id: 'daily_hidden_image',
    type: 'daily',
    title: 'Tile Revealer Master',
    description: 'Play and solve 1 Hidden Image tile puzzle.',
    targetCount: 1,
    currentCount: 1,
    rewardCoins: 200,
    rewardXP: 300,
    iconName: 'EyeOff',
    actionType: 'hidden_image'
  },
  {
    id: 'daily_no_hint',
    type: 'daily',
    title: 'Pure Instinct',
    description: 'Answer 3 picture questions without using any hints.',
    targetCount: 3,
    currentCount: 2,
    rewardCoins: 175,
    rewardXP: 200,
    iconName: 'Zap',
    actionType: 'browse'
  },
  {
    id: 'daily_logos',
    type: 'daily',
    title: 'Brand Specialist',
    description: 'Solve 3 questions in the Logos & Brands category.',
    targetCount: 3,
    currentCount: 1,
    rewardCoins: 150,
    rewardXP: 200,
    iconName: 'Target',
    category: 'Logos & Brands',
    actionType: 'play_pack',
    actionPackId: 'pack-famous-logos'
  }
];

const WEEKLY_CHALLENGES_DATA: ChallengeItem[] = [
  {
    id: 'weekly_marathon',
    type: 'weekly',
    title: 'Weekly Pack Marathon',
    description: '100% complete 2 full picture quiz packs this week.',
    targetCount: 2,
    currentCount: 1,
    rewardCoins: 600,
    rewardXP: 1000,
    iconName: 'Trophy',
    actionType: 'browse'
  },
  {
    id: 'weekly_accuracy',
    type: 'weekly',
    title: 'Accuracy Titan',
    description: 'Get 25 correct picture answers with over 80% accuracy.',
    targetCount: 25,
    currentCount: 18,
    rewardCoins: 500,
    rewardXP: 850,
    iconName: 'Target',
    actionType: 'browse'
  },
  {
    id: 'weekly_hidden_trio',
    type: 'weekly',
    title: 'Hidden Image Virtuoso',
    description: 'Guess 3 Hidden Image puzzles revealing fewer than 6 tiles.',
    targetCount: 3,
    currentCount: 2,
    rewardCoins: 450,
    rewardXP: 750,
    iconName: 'EyeOff',
    actionType: 'hidden_image'
  },
  {
    id: 'weekly_star_collector',
    type: 'weekly',
    title: 'Star Collector',
    description: 'Earn 6 total achievement stars across any quiz packs.',
    targetCount: 6,
    currentCount: 4,
    rewardCoins: 700,
    rewardXP: 1200,
    iconName: 'Star',
    actionType: 'browse'
  }
];

const STREAK_REWARDS = [
  { day: 1, coins: 50, xp: 50, label: 'Day 1' },
  { day: 2, coins: 100, xp: 100, label: 'Day 2' },
  { day: 3, coins: 150, xp: 150, label: 'Day 3' },
  { day: 4, coins: 200, xp: 200, label: 'Day 4' },
  { day: 5, coins: 300, xp: 300, label: 'Day 5' },
  { day: 6, coins: 400, xp: 400, label: 'Day 6' },
  { day: 7, coins: 750, xp: 1000, label: 'Day 7 Grand Prize', special: true }
];

export const ChallengesScreen: React.FC<ChallengesScreenProps> = ({
  user,
  onUpdateUser,
  onNavigateTab,
  onPlayPackDirect
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'weekly' | 'streak'>('all');
  
  // Storage state
  const [challengeState, setChallengeState] = useState(() => dbStore.getChallengeState());
  const [claimedDailies, setClaimedDailies] = useState<string[]>(() => challengeState.claimedDailies || []);
  const [claimedWeeklies, setClaimedWeeklies] = useState<string[]>(() => challengeState.claimedWeeklies || []);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [streakClaimedToday, setStreakClaimedToday] = useState<boolean>(() => challengeState.lastStreakClaimDate === todayStr);
  const [currentStreak, setCurrentStreak] = useState<number>(() => challengeState.streakDays || 3);

  const [rewardToast, setRewardToast] = useState<{ message: string; coins: number; xp: number } | null>(null);

  // Time remaining counters (simulated countdowns)
  const [dailyTimeLeft, setDailyTimeLeft] = useState('14h 22m 10s');
  const [weeklyTimeLeft, setWeeklyTimeLeft] = useState('4d 18h 45m');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = endOfDay.getTime() - now.getTime();
      
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setDailyTimeLeft(`${hrs}h ${mins}m ${secs}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const triggerRewardToast = (message: string, coins: number, xp: number) => {
    soundFx.playCorrect();
    setRewardToast({ message, coins, xp });
    setTimeout(() => setRewardToast(null), 4000);
  };

  const handleClaimDailyChallenge = (challenge: ChallengeItem) => {
    if (claimedDailies.includes(challenge.id)) return;

    const newClaimed = [...claimedDailies, challenge.id];
    setClaimedDailies(newClaimed);

    const newState = {
      ...challengeState,
      claimedDailies: newClaimed
    };
    setChallengeState(newState);
    dbStore.saveChallengeState(newState);

    onUpdateUser({
      ...user,
      coins: user.coins + challenge.rewardCoins,
      xp: user.xp + challenge.rewardXP
    });

    triggerRewardToast(`Claimed "${challenge.title}" Reward!`, challenge.rewardCoins, challenge.rewardXP);
  };

  const handleClaimWeeklyChallenge = (challenge: ChallengeItem) => {
    if (claimedWeeklies.includes(challenge.id)) return;

    const newClaimed = [...claimedWeeklies, challenge.id];
    setClaimedWeeklies(newClaimed);

    const newState = {
      ...challengeState,
      claimedWeeklies: newClaimed
    };
    setChallengeState(newState);
    dbStore.saveChallengeState(newState);

    onUpdateUser({
      ...user,
      coins: user.coins + challenge.rewardCoins,
      xp: user.xp + challenge.rewardXP
    });

    triggerRewardToast(`Claimed "${challenge.title}" Reward!`, challenge.rewardCoins, challenge.rewardXP);
  };

  const handleClaimDailyStreak = () => {
    if (streakClaimedToday) return;

    const currentDayReward = STREAK_REWARDS[(currentStreak - 1) % 7];
    const newStreak = currentStreak + 1;

    setStreakClaimedToday(true);
    setCurrentStreak(newStreak);

    const newState = {
      ...challengeState,
      lastStreakClaimDate: todayStr,
      streakDays: newStreak
    };
    setChallengeState(newState);
    dbStore.saveChallengeState(newState);

    onUpdateUser({
      ...user,
      coins: user.coins + currentDayReward.coins,
      xp: user.xp + currentDayReward.xp
    });

    triggerRewardToast(`Day ${currentDayReward.day} Streak Bonus Claimed!`, currentDayReward.coins, currentDayReward.xp);
  };

  const renderIcon = (name: string, className: string) => {
    switch (name) {
      case 'Flame': return <Flame className={className} />;
      case 'Trophy': return <Trophy className={className} />;
      case 'Target': return <Target className={className} />;
      case 'Zap': return <Zap className={className} />;
      case 'EyeOff': return <EyeOff className={className} />;
      case 'Star': return <Star className={className} />;
      default: return <Gift className={className} />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification Banner */}
      {rewardToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 p-4 rounded-2xl bg-slate-900 border-2 border-amber-400 text-white shadow-2xl flex items-center gap-4 animate-bounce">
          <div className="p-3 rounded-xl bg-amber-500 text-slate-950 font-black">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-sm text-amber-400 uppercase tracking-wide">{rewardToast.message}</h4>
            <p className="text-xs text-slate-300 font-extrabold flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-amber-400"><Coins className="w-3.5 h-3.5" /> +{rewardToast.coins} Coins</span>
              <span className="flex items-center gap-1 text-indigo-400"><Sparkles className="w-3.5 h-3.5" /> +{rewardToast.xp} XP</span>
            </p>
          </div>
        </div>
      )}

      {/* Header Banner with Resets */}
      <div className="p-6 rounded-[32px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-950 text-amber-400 font-black text-[10px] uppercase tracking-wider">
              LIMITED TIME EVENTS
            </span>
            <span className="flex items-center gap-1 text-xs font-black text-slate-950">
              <Flame className="w-4 h-4 text-slate-950" /> {currentStreak} Day Streak
            </span>
          </div>
          <h2 className="font-black text-2xl sm:text-3xl tracking-tight uppercase">Daily & Weekly Challenges</h2>
          <p className="text-xs text-slate-950/80 font-bold max-w-xl">
            Complete daily picture trivia tasks and weekly master quests to earn extra coin rewards and level up your XP!
          </p>
        </div>

        {/* Timers Box */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-950/90 text-amber-400 border border-amber-400/30 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase text-amber-300/80 block">Daily Reset</span>
              <span className="text-xs font-mono font-black">{dailyTimeLeft}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/90 text-indigo-300 border border-indigo-400/30 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-300/80 block">Weekly Reset</span>
              <span className="text-xs font-mono font-black">{weeklyTimeLeft}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Login Streak Calendar Widget */}
      <div className="p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                Daily Login Bonus Streak
              </h3>
              <p className="text-xs text-slate-500 font-bold">Log in consecutive days to claim bigger coin multipliers!</p>
            </div>
          </div>

          <button
            disabled={streakClaimedToday}
            onClick={handleClaimDailyStreak}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all ${
              streakClaimedToday
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
            }`}
          >
            {streakClaimedToday ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>STREAK CLAIMED TODAY</span>
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                <span>CLAIM DAY {(currentStreak - 1) % 7 + 1} REWARD</span>
              </>
            )}
          </button>
        </div>

        {/* 7 Days Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-2">
          {STREAK_REWARDS.map((item, index) => {
            const activeDayIndex = (currentStreak - 1) % 7;
            const isCompleted = index < activeDayIndex || (index === activeDayIndex && streakClaimedToday);
            const isCurrent = index === activeDayIndex && !streakClaimedToday;

            return (
              <div
                key={item.day}
                className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-between text-center space-y-2 transition-all ${
                  isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    : isCurrent
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-400/50'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider">
                  Day {item.day}
                </span>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : item.special ? (
                    <Gift className="w-5 h-5 text-amber-500 animate-bounce" />
                  ) : (
                    <Coins className="w-5 h-5 text-amber-500" />
                  )}
                </div>

                <div className="text-center leading-tight">
                  <p className="font-black text-xs">+{item.coins}</p>
                  <p className="text-[9px] font-extrabold opacity-75">+{item.xp} XP</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs Header */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'all'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Challenges
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'daily'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Daily Tasks ({DAILY_CHALLENGES_DATA.length})
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-2xl text-xs font-black transition-all ${
            activeTab === 'weekly'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Weekly Quests ({WEEKLY_CHALLENGES_DATA.length})
        </button>
      </div>

      {/* Challenges Content Lists */}
      <div className="space-y-6">
        
        {/* Daily Section */}
        {(activeTab === 'all' || activeTab === 'daily') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                Daily Challenges
              </h3>
              <span className="text-xs text-slate-500 font-extrabold">Resets in {dailyTimeLeft}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DAILY_CHALLENGES_DATA.map((item) => {
                const isClaimed = claimedDailies.includes(item.id);
                const isReadyToClaim = item.currentCount >= item.targetCount;
                const pct = Math.min(100, Math.round((item.currentCount / item.targetCount) * 100));

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-[28px] border-2 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4 ${
                      isClaimed
                        ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/30'
                        : isReadyToClaim
                        ? 'border-amber-400 dark:border-amber-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${
                            isClaimed
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                          }`}>
                            {renderIcon(item.iconName, 'w-5 h-5')}
                          </div>
                          <div>
                            <h4 className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400">
                              <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> +{item.rewardCoins}</span>
                              <span className="flex items-center gap-1 text-indigo-500"><Sparkles className="w-3.5 h-3.5" /> +{item.rewardXP} XP</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[10px] uppercase">
                          DAILY
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        {item.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{item.currentCount} / {item.targetCount} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isClaimed ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isClaimed ? (
                        <div className="w-full py-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>REWARD CLAIMED 🎉</span>
                        </div>
                      ) : isReadyToClaim ? (
                        <button
                          onClick={() => handleClaimDailyChallenge(item)}
                          className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
                        >
                          <Coins className="w-4 h-4" />
                          <span>CLAIM {item.rewardCoins} COINS REWARD</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundFx.playClick();
                            if (item.actionType === 'hidden_image' && onNavigateTab) {
                              onNavigateTab('hidden-image');
                            } else if (item.actionPackId && onPlayPackDirect) {
                              onPlayPackDirect(item.actionPackId);
                            } else if (onNavigateTab) {
                              onNavigateTab('home');
                            }
                          }}
                          className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <span>PLAY TO COMPLETE</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Weekly Section */}
        {(activeTab === 'all' || activeTab === 'weekly') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-indigo-500" />
                Weekly Quests
              </h3>
              <span className="text-xs text-slate-500 font-extrabold">Resets in {weeklyTimeLeft}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WEEKLY_CHALLENGES_DATA.map((item) => {
                const isClaimed = claimedWeeklies.includes(item.id);
                const isReadyToClaim = item.currentCount >= item.targetCount;
                const pct = Math.min(100, Math.round((item.currentCount / item.targetCount) * 100));

                return (
                  <div
                    key={item.id}
                    className={`p-5 rounded-[28px] border-2 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between space-y-4 ${
                      isClaimed
                        ? 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/30'
                        : isReadyToClaim
                        ? 'border-indigo-500 dark:border-indigo-600'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${
                            isClaimed
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                              : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                          }`}>
                            {renderIcon(item.iconName, 'w-5 h-5')}
                          </div>
                          <div>
                            <h4 className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400">
                              <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> +{item.rewardCoins}</span>
                              <span className="flex items-center gap-1 text-indigo-500"><Sparkles className="w-3.5 h-3.5" /> +{item.rewardXP} XP</span>
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-[10px] uppercase">
                          WEEKLY
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                        {item.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-500 dark:text-slate-400">
                          <span>Progress</span>
                          <span>{item.currentCount} / {item.targetCount} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isClaimed ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div>
                      {isClaimed ? (
                        <div className="w-full py-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-xs flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>WEEKLY QUEST COMPLETED 🎉</span>
                        </div>
                      ) : isReadyToClaim ? (
                        <button
                          onClick={() => handleClaimWeeklyChallenge(item)}
                          className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>CLAIM {item.rewardCoins} COINS + {item.rewardXP} XP</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            soundFx.playClick();
                            if (item.actionType === 'hidden_image' && onNavigateTab) {
                              onNavigateTab('hidden-image');
                            } else if (onNavigateTab) {
                              onNavigateTab('home');
                            }
                          }}
                          className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 font-black text-xs flex items-center justify-center gap-2 transition-all"
                        >
                          <span>PLAY QUEST PACKS</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
