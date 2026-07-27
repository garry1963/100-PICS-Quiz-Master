import React, { useState } from 'react';
import {
  X,
  Play,
  Download,
  CheckCircle2,
  Clock,
  Coins,
  Trophy,
  Sparkles,
  Flame,
  Star,
  Tag,
  WifiOff
} from 'lucide-react';
import { QuizPack, PlayerPackProgress } from '../types';
import { soundFx } from '../lib/sound';

interface PackDetailsModalProps {
  pack: QuizPack | null;
  progress: PlayerPackProgress;
  isDownloaded: boolean;
  onClose: () => void;
  onPlayPack: (packId: string) => void;
  onDownloadPack: (packId: string) => void;
}

export const PackDetailsModal: React.FC<PackDetailsModalProps> = ({
  pack,
  progress,
  isDownloaded,
  onClose,
  onPlayPack,
  onDownloadPack,
}) => {
  if (!pack) return null;

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const handleDownload = () => {
    soundFx.playClick();
    setDownloading(true);
    setDownloadProgress(10);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          soundFx.playCorrect();
          onDownloadPack(pack.id);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={() => {
          soundFx.playClick();
          onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-2xl z-10 text-slate-800 dark:text-slate-100 animate-in zoom-in-95 duration-200">
        
        {/* Banner Graphic */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={pack.banner || pack.thumbnail}
            alt={pack.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

          {/* Close button */}
          <button
            id="close-pack-modal-btn"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Difficulty & Category Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-600/90 text-white font-extrabold text-xs shadow-md backdrop-blur-md">
              {pack.category}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 font-black text-xs shadow-md backdrop-blur-md">
              {pack.difficulty}
            </span>
            {isDownloaded && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow-md backdrop-blur-md">
                <WifiOff className="w-3.5 h-3.5" />
                Offline Ready
              </span>
            )}
          </div>

          {/* Title on Banner */}
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="font-black text-2xl sm:text-3xl text-white tracking-tight drop-shadow-md">
              {pack.title}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
            {pack.description}
          </p>

          {/* Stat Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Questions</span>
              <span className="font-black text-lg text-slate-800 dark:text-slate-100">{pack.totalQuestions} Pics</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Est. Time</span>
              <span className="font-black text-lg text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {pack.estimatedTime}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">Coin Reward</span>
              <span className="font-black text-lg text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                <Coins className="w-4 h-4" />
                +{pack.coinReward}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-center">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-extrabold block">XP Reward</span>
              <span className="font-black text-lg text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                <Trophy className="w-4 h-4" />
                +{pack.xpReward} XP
              </span>
            </div>
          </div>

          {/* Progress Bar Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-slate-600 dark:text-slate-300">
              <span>Pack Progression</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {progress.completedQuestions.length} / {pack.totalQuestions} Solved ({progress.completionPercentage}%)
              </span>
            </div>
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Download & Play Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {!isDownloaded ? (
              <button
                id="download-pack-btn"
                disabled={downloading}
                onClick={handleDownload}
                className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{downloading ? `Downloading (${downloadProgress}%)...` : `Download (${pack.downloadSize})`}</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Downloaded for Offline Play</span>
              </div>
            )}

            <button
              id="play-pack-modal-btn"
              onClick={() => {
                soundFx.playClick();
                onPlayPack(pack.id);
                onClose();
              }}
              className="w-full flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{progress.completedQuestions.length > 0 ? 'CONTINUE QUIZ' : 'START PLAYING NOW'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
