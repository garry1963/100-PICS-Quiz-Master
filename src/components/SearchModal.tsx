import React from 'react';
import { Search, X, Play, ArrowRight } from 'lucide-react';
import { QuizPack } from '../types';
import { soundFx } from '../lib/sound';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  packs: QuizPack[];
  onSelectPack: (p: QuizPack) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  packs,
  onSelectPack,
}) => {
  if (!isOpen) return null;

  const results = packs.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => {
          soundFx.playClick();
          onClose();
        }}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-6 shadow-2xl z-10 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3.5">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search packs by title, category, or topic..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 text-sm font-extrabold focus:outline-none placeholder-slate-400"
          />
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
          {results.length === 0 ? (
            <p className="text-center text-slate-500 font-bold text-xs py-8">No quiz packs found matching "{searchQuery}".</p>
          ) : (
            results.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  soundFx.playClick();
                  onSelectPack(p);
                  onClose();
                }}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={p.thumbnail} alt={p.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">{p.title}</h4>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold">{p.category} • {p.totalQuestions} Pics</p>
                  </div>
                </div>

                <button className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
