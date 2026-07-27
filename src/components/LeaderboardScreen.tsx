import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Award,
  Crown,
  Flame,
  Coins,
  Sparkles,
  Search,
  CheckCircle2,
  Medal,
  ChevronUp,
  UserCheck,
  TrendingUp,
  Zap,
  Star,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { UserProfile } from '../types';
import { soundFx } from '../lib/sound';

interface LeaderboardScreenProps {
  currentUser: UserProfile;
  onNavigateTab?: (tab: string) => void;
}

export interface LeaderboardPlayer {
  id: string;
  rank: number;
  username: string;
  avatar: string;
  title: string;
  xp: number;
  coins: number;
  level: number;
  packsCompleted: number;
  streakDays: number;
  countryFlag: string;
  isCurrentUser?: boolean;
  changeStatus?: 'up' | 'down' | 'same';
}

const MOCK_LEADERBOARD_PLAYERS: Omit<LeaderboardPlayer, 'rank'>[] = [
  {
    id: 'user_master_01',
    username: 'PicturePro_99',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    title: 'Grandmaster Trivia King',
    xp: 18450,
    coins: 12400,
    level: 185,
    packsCompleted: 42,
    streakDays: 34,
    countryFlag: '🇬🇧',
    changeStatus: 'same'
  },
  {
    id: 'user_master_02',
    username: 'PixelQueen_UK',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    title: 'Logo & Brand Master',
    xp: 16200,
    coins: 9800,
    level: 162,
    packsCompleted: 38,
    streakDays: 28,
    countryFlag: '🇺🇸',
    changeStatus: 'up'
  },
  {
    id: 'user_master_03',
    username: 'TriviaWizard_X',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    title: '100 PICS Veteran',
    xp: 14800,
    coins: 8500,
    level: 148,
    packsCompleted: 34,
    streakDays: 19,
    countryFlag: '🇨🇦',
    changeStatus: 'down'
  },
  {
    id: 'user_master_04',
    username: 'SnapSolver',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    title: 'Animal & Nature Guru',
    xp: 12900,
    coins: 6700,
    level: 129,
    packsCompleted: 29,
    streakDays: 14,
    countryFlag: '🇦🇺',
    changeStatus: 'up'
  },
  {
    id: 'user_master_05',
    username: 'MovieBuff_2026',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    title: 'Cinema Connoisseur',
    xp: 11400,
    coins: 5900,
    level: 114,
    packsCompleted: 26,
    streakDays: 12,
    countryFlag: '🇩🇪',
    changeStatus: 'same'
  },
  {
    id: 'user_master_06',
    username: 'FlagFinder_Sam',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    title: 'Geography Champion',
    xp: 9800,
    coins: 4300,
    level: 98,
    packsCompleted: 22,
    streakDays: 8,
    countryFlag: '🇫🇷',
    changeStatus: 'up'
  },
  {
    id: 'user_master_07',
    username: 'FoodieGamer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
    title: 'Culinary Detective',
    xp: 8700,
    coins: 3800,
    level: 87,
    packsCompleted: 19,
    streakDays: 6,
    countryFlag: '🇮🇹',
    changeStatus: 'down'
  },
  {
    id: 'user_master_08',
    username: 'RetroGamer_88',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    title: 'Nostalgia Expert',
    xp: 7500,
    coins: 3100,
    level: 75,
    packsCompleted: 16,
    streakDays: 5,
    countryFlag: '🇯🇵',
    changeStatus: 'same'
  }
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  currentUser,
  onNavigateTab
}) => {
  const [timeframe, setTimeframe] = useState<'all' | 'weekly' | 'monthly'>('weekly');
  const [metric, setMetric] = useState<'xp' | 'coins' | 'packsCompleted' | 'streakDays'>('xp');
  const [searchQuery, setSearchQuery] = useState('');

  // Assemble full players list incorporating current user
  const leaderboardData = useMemo(() => {
    const userEntry: Omit<LeaderboardPlayer, 'rank'> = {
      id: currentUser.id || 'curr_user',
      username: currentUser.username || 'Quiz Master Player',
      avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      title: currentUser.title || 'Trivia Explorer',
      xp: currentUser.xp || 1250,
      coins: currentUser.coins || 500,
      level: currentUser.level || 12,
      packsCompleted: 12,
      streakDays: currentUser.currentStreak || 3,
      countryFlag: '🇬🇧',
      isCurrentUser: true,
      changeStatus: 'up'
    };

    const combined = [...MOCK_LEADERBOARD_PLAYERS];
    // Check if current user is already in list or needs inserting
    const existsIdx = combined.findIndex(p => p.id === currentUser.id);
    if (existsIdx !== -1) {
      combined[existsIdx] = { ...combined[existsIdx], ...userEntry };
    } else {
      combined.push(userEntry);
    }

    // Sort according to metric
    combined.sort((a, b) => b[metric] - a[metric]);

    // Assign rank numbers
    const rankedList: LeaderboardPlayer[] = combined.map((player, idx) => ({
      ...player,
      rank: idx + 1
    }));

    return rankedList;
  }, [currentUser, metric]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return leaderboardData;
    return leaderboardData.filter(p =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leaderboardData, searchQuery]);

  // Find user's current rank
  const userRankEntry = useMemo(() => {
    return leaderboardData.find(p => p.isCurrentUser);
  }, [leaderboardData]);

  const handleFireworkCelebration = () => {
    soundFx.playCorrect();
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#f59e0b', '#6366f1', '#10b981', '#ec4899', '#e11d48']
    });
  };

  const top3 = filteredList.slice(0, 3);
  const remainingPlayers = filteredList.slice(3);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-6 rounded-[32px] bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-2 border-indigo-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Glowing backdrop elements */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
              <Trophy className="w-3.5 h-3.5" /> GLOBAL LEAGUES
            </span>
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 font-extrabold text-[10px] uppercase border border-indigo-400/30">
              {timeframe === 'weekly' ? 'Weekly Sprint' : timeframe === 'monthly' ? 'Monthly Season' : 'Hall of Fame'}
            </span>
          </div>
          <h2 className="font-black text-2xl sm:text-3xl tracking-tight uppercase flex items-center gap-2">
            Global Trivia Leaderboard
          </h2>
          <p className="text-xs text-indigo-200 font-medium max-w-xl">
            Compete against players worldwide! Solve picture trivia packs, maintain daily streaks, and climb the ranks to earn ultimate bragging rights.
          </p>
        </div>

        {/* User Rank Card Pill */}
        {userRankEntry && (
          <div className="z-10 p-4 rounded-2xl bg-indigo-950/80 border border-indigo-500/40 shadow-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-md">
              #{userRankEntry.rank}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-300 block">Your Current Rank</span>
              <p className="text-sm font-black text-white flex items-center gap-2">
                <span>{userRankEntry.username}</span>
                <span className="text-xs text-indigo-300 font-bold">({userRankEntry.xp} XP)</span>
              </p>
            </div>
            <button
              onClick={handleFireworkCelebration}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all active:scale-95"
              title="Celebrate Rank!"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Control Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        
        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => { soundFx.playClick(); setTimeframe('weekly'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              timeframe === 'weekly'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Weekly League
          </button>
          <button
            onClick={() => { soundFx.playClick(); setTimeframe('monthly'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              timeframe === 'monthly'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => { soundFx.playClick(); setTimeframe('all'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              timeframe === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All-Time
          </button>
        </div>

        {/* Metric category selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => { soundFx.playClick(); setMetric('xp'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              metric === 'xp'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>XP</span>
          </button>
          <button
            onClick={() => { soundFx.playClick(); setMetric('coins'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              metric === 'coins'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Coins</span>
          </button>
          <button
            onClick={() => { soundFx.playClick(); setMetric('streakDays'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
              metric === 'streakDays'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Streak</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-48 pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* TOP 3 PODIUM DISPLAY */}
      {!searchQuery && top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-4 items-end max-w-3xl mx-auto">
          
          {/* 2nd Place (Silver) */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-slate-300 dark:border-slate-600 overflow-hidden shadow-lg relative">
                <img src={top3[1].avatar} alt={top3[1].username} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-md">
                #2
              </div>
            </div>
            <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 text-center truncate max-w-[100px] mt-2">
              {top3[1].username}
            </h4>
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
              {top3[1][metric]} {metric.toUpperCase()}
            </span>

            <div className="w-full h-28 sm:h-36 mt-3 rounded-t-2xl bg-gradient-to-b from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900 border-t-4 border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-2 text-center shadow-md">
              <Medal className="w-8 h-8 text-slate-400 mb-1" />
              <span className="text-[10px] font-black uppercase text-slate-500">SILVER LEAGUE</span>
            </div>
          </div>

          {/* 1st Place (Gold Crown) */}
          <div className="flex flex-col items-center -mt-6">
            <div className="relative mb-2 flex flex-col items-center">
              <Crown className="w-8 h-8 text-amber-400 mb-1 animate-bounce" />
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-amber-400 overflow-hidden shadow-xl ring-4 ring-amber-400/30 relative">
                <img src={top3[0].avatar} alt={top3[0].username} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-md">
                #1
              </div>
            </div>
            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 text-center truncate max-w-[120px] mt-2">
              {top3[0].username}
            </h4>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {top3[0][metric]} {metric.toUpperCase()}
            </span>

            <div className="w-full h-36 sm:h-44 mt-3 rounded-t-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 border-t-4 border-amber-300 flex flex-col items-center justify-center p-2 text-center shadow-xl">
              <Trophy className="w-10 h-10 text-slate-950 mb-1" />
              <span className="text-xs font-black uppercase tracking-wider">GOLD LEAGUE CHAMP</span>
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div className="flex flex-col items-center">
            <div className="relative mb-2 flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-amber-700/60 overflow-hidden shadow-lg relative">
                <img src={top3[2].avatar} alt={top3[2].username} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-amber-800 text-amber-100 font-black text-xs shadow-md">
                #3
              </div>
            </div>
            <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 text-center truncate max-w-[100px] mt-2">
              {top3[2].username}
            </h4>
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">
              {top3[2][metric]} {metric.toUpperCase()}
            </span>

            <div className="w-full h-24 sm:h-32 mt-3 rounded-t-2xl bg-gradient-to-b from-amber-900/30 to-amber-950/60 dark:from-amber-950 dark:to-slate-900 border-t-4 border-amber-800 flex flex-col items-center justify-center p-2 text-center shadow-md">
              <Award className="w-7 h-7 text-amber-600 mb-1" />
              <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">BRONZE LEAGUE</span>
            </div>
          </div>

        </div>
      )}

      {/* REMAINDER PLAYERS TABLE LIST */}
      <div className="p-4 sm:p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-black text-slate-400 uppercase tracking-wider">
          <span>Rank & Player</span>
          <div className="flex items-center gap-6">
            <span>Level</span>
            <span className="min-w-[70px] text-right">{metric.toUpperCase()}</span>
          </div>
        </div>

        <div className="space-y-2">
          {filteredList.map((player) => {
            const isMe = player.isCurrentUser;

            return (
              <div
                key={player.id}
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-4 transition-all ${
                  isMe
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300'
                }`}
              >
                {/* Left: Rank # + Avatar + Info */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 ${
                    player.rank === 1
                      ? 'bg-amber-500 text-slate-950'
                      : player.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : player.rank === 3
                      ? 'bg-amber-800 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    #{player.rank}
                  </div>

                  <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700">
                    <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-slate-900 dark:text-slate-100 truncate">
                        {player.username}
                      </h4>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[9px] uppercase">
                          YOU
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold truncate">
                      {player.title}
                    </p>
                  </div>
                </div>

                {/* Right Stats */}
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center hidden sm:block">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Level</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">{player.level}</span>
                  </div>

                  <div className="text-right min-w-[70px]">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center justify-end gap-1">
                      {metric === 'xp' && <Sparkles className="w-3.5 h-3.5" />}
                      {metric === 'coins' && <Coins className="w-3.5 h-3.5" />}
                      {metric === 'streakDays' && <Flame className="w-3.5 h-3.5 text-orange-500" />}
                      <span>{player[metric]}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
