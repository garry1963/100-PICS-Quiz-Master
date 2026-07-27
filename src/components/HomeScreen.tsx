import React, { useState, useMemo } from 'react';
import {
  Play,
  Flame,
  Search,
  Sparkles,
  Trophy,
  Coins,
  CheckCircle2,
  Clock,
  Filter,
  Star,
  Download,
  Grid,
  ChevronRight,
  WifiOff,
  EyeOff
} from 'lucide-react';
import { QuizPack, PlayerPackProgress, QuizCategory } from '../types';
import { dbStore } from '../lib/storage';
import { soundFx } from '../lib/sound';

interface HomeScreenProps {
  packs: QuizPack[];
  categories: QuizCategory[];
  downloadedPackIds: string[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectPack: (pack: QuizPack) => void;
  onPlayPackDirect: (packId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  packs,
  categories,
  downloadedPackIds,
  searchQuery,
  onSearchChange,
  onSelectPack,
  onPlayPackDirect,
  onNavigateTab,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  // Find last played pack for Hero "Continue Playing" card
  const continuePack = useMemo(() => {
    for (const p of packs) {
      const prog = dbStore.getPackProgress(p.id);
      if (prog.completedQuestions.length > 0 && prog.completionPercentage < 100) {
        return { pack: p, progress: prog };
      }
    }
    return packs[0] ? { pack: packs[0], progress: dbStore.getPackProgress(packs[0].id) } : null;
  }, [packs]);

  // Filtered packs list
  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;

      return matchesSearch && matchesCat && matchesDiff;
    });
  }, [packs, searchQuery, selectedCategory, selectedDifficulty]);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Featured Hero Banner & Continue Playing Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Featured Daily Challenge Hero Card */}
        <div className="lg:col-span-8 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-900/20 flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10 space-y-2">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-lg text-xs font-bold uppercase tracking-widest mb-2">
              Daily Trivia Challenge
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
              Logo Legend & Picture Trivia
            </h2>
            <p className="text-indigo-100 font-medium text-sm max-w-md pt-1">
              Can you identify 10 rare pictures in under 60 seconds to claim 150 bonus coins?
            </p>
          </div>

          <div className="relative z-10 pt-6 flex items-center justify-between gap-4">
            <button
              id="hero-play-daily-btn"
              onClick={() => {
                soundFx.playClick();
                onNavigateTab('challenges');
              }}
              className="bg-white text-indigo-700 hover:bg-slate-100 px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-950/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>PLAY DAILY NOW</span>
            </button>

            <span className="hidden sm:flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold border border-white/20">
              <Flame className="w-4 h-4 text-amber-300" />
              <span>14 Day Streak Active</span>
            </span>
          </div>

          <svg className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 opacity-30 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
        </div>

        {/* Hidden Image Puzzle Mode Banner Widget */}
        <div className="lg:col-span-4 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 rounded-[32px] p-6 text-slate-950 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-slate-950 text-amber-400 font-black text-[10px] uppercase">
                NEW GAME MODE
              </span>
              <EyeOff className="w-6 h-6 text-slate-950" />
            </div>
            <h3 className="font-black text-2xl tracking-tight text-slate-950">Hidden Image</h3>
            <p className="text-xs text-slate-950/80 font-bold leading-relaxed">
              Tiles cover the picture! Tap squares one by one to reveal clues. Guess with fewer tiles for max score & coins!
            </p>
          </div>

          <button
            id="hero-play-hidden-image-btn"
            onClick={() => {
              soundFx.playClick();
              onNavigateTab('hidden-image');
            }}
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black text-sm rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <EyeOff className="w-4 h-4" />
            <span>PLAY HIDDEN IMAGE</span>
          </button>
        </div>

      </div>

      {/* Leaderboard Quick Access Strip */}
      <div
        onClick={() => {
          soundFx.playClick();
          onNavigateTab('leaderboard');
        }}
        className="p-5 rounded-[28px] bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-amber-500/30 text-white shadow-md flex items-center justify-between gap-4 cursor-pointer hover:border-amber-400 transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-black flex-shrink-0 group-hover:scale-105 transition-transform">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase">GLOBAL RANKS</span>
              <span className="text-xs text-amber-400 font-extrabold">Weekly Sprint Active</span>
            </div>
            <h3 className="font-black text-lg text-white tracking-tight">Check Your Ranking on the Global Leaderboard</h3>
            <p className="text-xs text-slate-300 font-medium hidden sm:block">See top players, compete in weekly leagues, and earn ranking trophies!</p>
          </div>
        </div>

        <button className="px-4 py-2.5 rounded-2xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all flex-shrink-0">
          <span>VIEW RANKS</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Category Filter Chips Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Popular Categories</h3>
          <button
            onClick={() => onNavigateTab('categories')}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-extrabold"
          >
            See All ({categories.length}) →
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => { soundFx.playClick(); setSelectedCategory('All'); }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap ${
              selectedCategory === 'All'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
            }`}
          >
            All Categories
          </button>

          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => { soundFx.playClick(); setSelectedCategory(c.name); }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all whitespace-nowrap flex items-center gap-2 ${
                selectedCategory === c.name
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quiz Packs Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">
            {selectedCategory === 'All' ? 'Popular Packs' : `${selectedCategory} Packs`} ({filteredPacks.length})
          </h3>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
        </div>

        {filteredPacks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2 bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-extrabold text-slate-700 dark:text-slate-200">No quiz packs found matching your query.</p>
            <p className="text-xs">Try clearing your search query or selecting a different category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPacks.map((pack) => {
              const prog = dbStore.getPackProgress(pack.id);
              const isDownloaded = downloadedPackIds.includes(pack.id);

              return (
                <div
                  key={pack.id}
                  onClick={() => {
                    soundFx.playClick();
                    onSelectPack(pack);
                  }}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-[28px] overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all group cursor-pointer"
                >
                  {/* Thumbnail Image */}
                  <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={pack.thumbnail}
                      alt={pack.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Offline Download Badge */}
                    {isDownloaded && (
                      <span className="absolute top-3 left-3 p-1.5 rounded-full bg-emerald-500 text-white shadow-md" title="Downloaded for offline play">
                        <WifiOff className="w-3.5 h-3.5" />
                      </span>
                    )}

                    {/* Difficulty Tag */}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-black text-[10px] uppercase border border-amber-200 dark:border-amber-800">
                      {pack.difficulty}
                    </span>

                    {/* Category Tag */}
                    <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] border border-indigo-200 dark:border-indigo-800">
                      {pack.category}
                    </span>
                  </div>

                  {/* Content Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {pack.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {pack.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>{pack.totalQuestions} Pics</span>
                        <span className="text-indigo-600 dark:text-indigo-400">{prog.completionPercentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${prog.completionPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Rewards & Play Action */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-600 dark:text-amber-400 font-black">🪙 +{pack.coinReward}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-black">⚡ +{pack.xpReward} XP</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          soundFx.playClick();
                          onPlayPackDirect(pack.id);
                        }}
                        className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 dark:text-slate-200 transition-all"
                        title="Play Pack"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
