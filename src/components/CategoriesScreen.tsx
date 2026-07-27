import React from 'react';
import { Grid, ChevronRight, Play } from 'lucide-react';
import { QuizCategory, QuizPack } from '../types';
import { dbStore } from '../lib/storage';
import { soundFx } from '../lib/sound';

interface CategoriesScreenProps {
  categories: QuizCategory[];
  packs: QuizPack[];
  onSelectCategoryPacks: (categoryName: string) => void;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({
  categories,
  packs,
  onSelectCategoryPacks,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-3xl text-slate-800 dark:text-slate-100 tracking-tight uppercase">Explore Categories</h2>
        <p className="text-xs text-slate-500 font-bold">Discover thousands of picture questions across all trivia topics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const categoryPacks = packs.filter((p) => p.category === cat.name);
          const totalPics = categoryPacks.reduce((acc, p) => acc + p.totalQuestions, 0);

          return (
            <div
              key={cat.id}
              onClick={() => {
                soundFx.playClick();
                onSelectCategoryPacks(cat.name);
              }}
              className="group p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all hover:shadow-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-4xl p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 group-hover:scale-105 transition-transform">
                  {cat.icon}
                </div>
                <span className="px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs border border-indigo-200 dark:border-indigo-800">
                  {categoryPacks.length} Packs
                </span>
              </div>

              <div>
                <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="font-extrabold text-slate-700 dark:text-slate-300">{totalPics} Picture Questions</span>
                <ChevronRight className="w-4 h-4 text-indigo-600 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
