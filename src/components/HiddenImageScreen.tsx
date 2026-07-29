import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Coins,
  Eye,
  EyeOff,
  HelpCircle,
  Lightbulb,
  Eraser,
  Sparkles,
  CheckCircle2,
  Maximize2,
  RotateCcw,
  Grid,
  Trophy,
  Shuffle,
  Zap,
  Info,
  Image as ImageIcon,
  Tag
} from 'lucide-react';
import { UserProfile, QuizPack, Question } from '../types';
import { dbStore } from '../lib/storage';
import { soundFx } from '../lib/sound';

interface HiddenImageScreenProps {
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onBack: () => void;
  packs: QuizPack[];
  questions: Question[];
}

export const HiddenImageScreen: React.FC<HiddenImageScreenProps> = ({
  user,
  onUpdateUser,
  onBack,
  packs,
  questions
}) => {
  // Filter questions that are valid and non-hidden
  const availableQuestions = useMemo(() => {
    return questions.filter((q) => !q.isHidden && q.image && q.correctAnswer);
  }, [questions]);

  // Selected pack filter
  const [selectedPackId, setSelectedPackId] = useState<string>('all');
  const [gridSize, setGridSize] = useState<number>(4); // 4x4 (16 tiles) or 5x5 (25 tiles)
  
  // Filtered active question set
  const filteredQuestions = useMemo(() => {
    if (selectedPackId === 'all') return availableQuestions;
    return availableQuestions.filter((q) => q.packId === selectedPackId);
  }, [availableQuestions, selectedPackId]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const currentQuestion = filteredQuestions[currentQuestionIndex] || availableQuestions[0];

  const totalTiles = gridSize * gridSize;

  // Grid tiles state: false = covered, true = revealed
  const [revealedTiles, setRevealedTiles] = useState<boolean[]>(() =>
    new Array(totalTiles).fill(false)
  );

  // Answer slots and letter bank state
  const [answerSlots, setAnswerSlots] = useState<string[]>([]);
  const [letterBank, setLetterBank] = useState<
    { id: string; char: string; used: boolean }[]
  >([]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // Score & Reward metrics
  const [score, setScore] = useState<number>(0);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);

  // Initialize question state whenever currentQuestion or gridSize changes
  useEffect(() => {
    if (!currentQuestion) return;

    const answerStr = currentQuestion.correctAnswer.toUpperCase();
    const savedState = dbStore.getQuestionAnswerState(currentQuestion.id);
    const wasGuessed = savedState?.guessedCorrectly;

    if (wasGuessed) {
      setIsCorrect(true);
      setRevealedTiles(new Array(gridSize * gridSize).fill(true));
      setAnswerSlots(answerStr.split('').map(ch => (/[A-Z]/.test(ch) ? ch : '')));
    } else {
      setIsCorrect(false);
      setRevealedTiles(new Array(gridSize * gridSize).fill(false));
      setAnswerSlots(new Array(answerStr.length).fill(''));
    }

    setHintMessage(null);

    const lettersOnly = answerStr.replace(/[^A-Z]/g, '');

    // Generate scrambled letter bank (correct letters + distractors)
    const distractors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const extraCount = Math.max(12 - lettersOnly.length, 4);
    let bankChars = lettersOnly.split('');

    for (let i = 0; i < extraCount; i++) {
      const randChar = distractors.charAt(Math.floor(Math.random() * distractors.length));
      bankChars.push(randChar);
    }

    // Fisher-Yates Shuffle
    for (let i = bankChars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bankChars[i], bankChars[j]] = [bankChars[j], bankChars[i]];
    }

    setLetterBank(
      bankChars.map((char, index) => ({
        id: `tile-${index}-${char}`,
        char,
        used: wasGuessed ? lettersOnly.includes(char) : false
      }))
    );
  }, [currentQuestionIndex, selectedPackId, gridSize, currentQuestion]);

  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-slate-400 font-bold">No picture questions available for this pack.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-black text-sm"
        >
          Return to Packs
        </button>
      </div>
    );
  }

  const answer = currentQuestion.correctAnswer.toUpperCase();
  const tilesRevealedCount = revealedTiles.filter(Boolean).length;
  const tilesRemainingCount = totalTiles - tilesRevealedCount;

  // Potential coin reward decreases as more tiles are opened
  const potentialReward = Math.max(5, 10 + tilesRemainingCount * 2);

  // Handler: Tap a grid block to reveal
  const handleTileClick = (index: number) => {
    if (revealedTiles[index] || isCorrect) return;

    soundFx.playPop();
    const next = [...revealedTiles];
    next[index] = true;
    setRevealedTiles(next);
  };

  // Handler: Reveal random unrevealed square
  const handleRevealRandomSquare = () => {
    if (isCorrect) return;
    const unrevealedIndices = revealedTiles
      .map((revealed, idx) => (!revealed ? idx : -1))
      .filter((idx) => idx !== -1);

    if (unrevealedIndices.length === 0) return;

    soundFx.playPop();
    const randIdx = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
    const next = [...revealedTiles];
    next[randIdx] = true;
    setRevealedTiles(next);
  };

  // Handler: Select a tile from the letter bank
  const handleSelectBankTile = (tileId: string, char: string) => {
    if (isCorrect) return;

    soundFx.playClick();

    // Find first empty slot corresponding to an alphabet letter
    const newSlots = [...answerSlots];
    let placedIndex = -1;

    for (let i = 0; i < answer.length; i++) {
      const expectedChar = answer[i];
      if (/[A-Z]/.test(expectedChar) && !newSlots[i]) {
        newSlots[i] = char;
        placedIndex = i;
        break;
      }
    }

    if (placedIndex === -1) return; // All letter slots filled

    // Mark letter bank tile as used
    setLetterBank((prev) =>
      prev.map((t) => (t.id === tileId ? { ...t, used: true } : t))
    );

    setAnswerSlots(newSlots);

    // Check if whole word is completed
    checkAnswerCompletion(newSlots);
  };

  // Handler: Clear letter slot
  const handleClearSlot = (slotIndex: number) => {
    if (isCorrect) return;
    const char = answerSlots[slotIndex];
    if (!char) return;

    soundFx.playClick();

    const newSlots = [...answerSlots];
    newSlots[slotIndex] = '';
    setAnswerSlots(newSlots);

    // Unuse first matching letter tile in bank
    setLetterBank((prev) => {
      const idx = prev.findIndex((t) => t.used && t.char === char);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], used: false };
        return next;
      }
      return prev;
    });
  };

  // Keyboard support for desktop / physical typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCorrect || !currentQuestion) return;

      const key = e.key.toUpperCase();

      if (/[A-Z]/.test(key) && key.length === 1) {
        const availableTile = letterBank.find((t) => t.char === key && !t.used);
        if (availableTile) {
          handleSelectBankTile(availableTile.id, availableTile.char);
        }
      } else if (e.key === 'Backspace') {
        const ans = currentQuestion.correctAnswer.toUpperCase();
        for (let i = answerSlots.length - 1; i >= 0; i--) {
          if (/[A-Z]/.test(ans[i]) && answerSlots[i] !== '') {
            handleClearSlot(i);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [letterBank, answerSlots, isCorrect, currentQuestion]);

  // Answer validation logic
  const checkAnswerCompletion = (currentSlots: string[]) => {
    let constructed = '';
    for (let i = 0; i < answer.length; i++) {
      if (/[A-Z]/.test(answer[i])) {
        constructed += currentSlots[i] || ' ';
      } else {
        constructed += answer[i];
      }
    }

    const isMatch =
      constructed.trim().toUpperCase() === answer.trim().toUpperCase() ||
      (currentQuestion.alternativeAcceptedAnswers || []).some(
        (alt) => alt.trim().toUpperCase() === constructed.trim().toUpperCase()
      );

    if (isMatch) {
      // Correct answer!
      setIsCorrect(true);
      soundFx.playCorrect();

      // Trigger celebratory confetti burst
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#6366f1', '#10b981', '#ec4899', '#3b82f6']
      });

      // Reveal all tiles to showcase full picture
      setRevealedTiles(new Array(totalTiles).fill(true));

      // Calculate score & coins
      const earnedCoins = Math.max(10, 15 + tilesRemainingCount * 2);
      const earnedScore = 100 + tilesRemainingCount * 10;

      setCoinsEarned(earnedCoins);
      setScore(earnedScore);

      // Save player progress & question answer state
      dbStore.saveQuestionAnswerState({
        questionId: currentQuestion.id,
        guessedCorrectly: true,
        revealedLettersIndices: [],
        removedDistractors: [],
        hintsUsedCount: 0,
        timestamp: new Date().toISOString()
      });

      // Update pack progression if question has packId
      if (currentQuestion.packId) {
        const prog = dbStore.getPackProgress(currentQuestion.packId);
        if (!prog.completedQuestions.includes(currentQuestion.id)) {
          const updatedCompleted = [...prog.completedQuestions, currentQuestion.id];
          const packObj = packs.find(p => p.id === currentQuestion.packId);
          const total = packObj?.totalQuestions || 20;
          const pct = Math.round((updatedCompleted.length / total) * 100);
          dbStore.savePackProgress({
            ...prog,
            completedQuestions: updatedCompleted,
            completionPercentage: pct,
            starsEarned: pct >= 100 ? 3 : pct >= 50 ? 2 : 1
          });
        }
      }
      const updatedUser = {
        ...user,
        coins: user.coins + earnedCoins,
        xp: user.xp + Math.floor(earnedScore / 2)
      };
      onUpdateUser(updatedUser);
    }
  };

  // Hint handlers
  const handleHintRevealLetter = () => {
    if (user.coins < 15) {
      setHintMessage('Not enough coins! You need 15 🪙');
      return;
    }

    // Find first unrevealed letter slot
    let targetIndex = -1;
    for (let i = 0; i < answer.length; i++) {
      if (/[A-Z]/.test(answer[i]) && answerSlots[i] !== answer[i]) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) return;

    soundFx.playClick();
    const correctChar = answer[targetIndex];

    // Deduct 15 coins
    const nextUser = { ...user, coins: user.coins - 15 };
    onUpdateUser(nextUser);

    // Place correct char
    const newSlots = [...answerSlots];
    newSlots[targetIndex] = correctChar;
    setAnswerSlots(newSlots);

    checkAnswerCompletion(newSlots);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < filteredQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      // Loop or restart pack
      setCurrentQuestionIndex(0);
    }
  };

  const handleRandomQuestion = () => {
    const randIdx = Math.floor(Math.random() * filteredQuestions.length);
    setCurrentQuestionIndex(randIdx);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 space-y-5">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] shadow-xs text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-3">
          <button
            id="hidden-back-btn"
            onClick={() => {
              soundFx.playClick();
              onBack();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                <EyeOff className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Hidden Picture Quiz
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-extrabold">
              Picture {currentQuestionIndex + 1} of {filteredQuestions.length}
            </p>
          </div>
        </div>

        {/* Controls: Grid Size & Coins */}
        <div className="flex items-center gap-2">
          {/* Grid Size Toggle */}
          <button
            onClick={() => {
              soundFx.playClick();
              setGridSize(gridSize === 4 ? 5 : 4);
            }}
            className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center gap-1.5"
            title="Toggle Tile Grid Density"
          >
            <Grid className="w-4 h-4" />
            <span>{gridSize}x{gridSize} ({totalTiles} Tiles)</span>
          </button>

          {/* Coins Badge */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-black text-xs">
            <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{user.coins}</span>
          </div>
        </div>
      </div>

      {/* Hidden Picture Category / Pack Navigation Tabs */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            Select Picture Pack
          </span>
          <span className="text-[10px] text-slate-400 font-bold">{filteredQuestions.length} Puzzles</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              soundFx.playClick();
              setSelectedPackId('all');
              setCurrentQuestionIndex(0);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedPackId === 'all'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Picture Packs</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              selectedPackId === 'all' ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {availableQuestions.length}
            </span>
          </button>

          {packs.map((p) => {
            const packQCount = availableQuestions.filter(q => q.packId === p.id).length;
            if (packQCount === 0) return null;

            const isSelected = selectedPackId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  soundFx.playClick();
                  setSelectedPackId(p.id);
                  setCurrentQuestionIndex(0);
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-400'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{p.title}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {packQCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: ENLARGED HIDDEN PICTURE (POSITIONED ABOVE LETTERS & SLOTS) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-4 sm:p-6 shadow-md space-y-4 text-center">
        
        {/* Tab Header Badge for Hidden Picture */}
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black">
            <ImageIcon className="w-4 h-4" />
            Hidden Picture Clue
          </span>
          <span className="flex items-center gap-1 text-slate-400 text-[11px]">
            <Eye className="w-3.5 h-3.5 text-indigo-500" />
            {isCorrect ? (
              <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">100% Revealed</strong>
            ) : (
              <span>Revealed: <strong className="text-indigo-600 dark:text-indigo-400">{tilesRevealedCount}</strong> / {totalTiles}</span>
            )}
          </span>
        </div>

        {/* Enlarged Picture Canvas Frame */}
        <div className="relative w-full aspect-square max-w-md sm:max-w-lg mx-auto bg-slate-950 border-4 border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-xl group select-none transition-all">
          
          {/* The Actual Hidden Image - Always crisp and fully unblurred once solved */}
          <img
            src={currentQuestion.image}
            alt="Hidden Quiz Clue"
            className="w-full h-full object-cover rounded-[24px]"
          />

          {/* Interactive Cover Grid Tiles Overlay */}
          <div
            className={`absolute inset-0 grid gap-1.5 p-2 bg-slate-950/40 backdrop-blur-[1px] transition-all duration-700 ${
              isCorrect ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            style={{
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
            }}
          >
            {revealedTiles.map((isRevealed, idx) => {
              const isTileOpen = isRevealed || isCorrect;
              return (
                <button
                  key={`tile-block-${idx}`}
                  disabled={isTileOpen}
                  onClick={() => handleTileClick(idx)}
                  className={`relative rounded-xl font-black text-sm sm:text-base flex items-center justify-center transition-all transform duration-500 ${
                    isTileOpen
                      ? 'opacity-0 scale-50 -rotate-6 pointer-events-none'
                      : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-indigo-100 border-2 border-indigo-400/30 shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                >
                  {!isTileOpen && (
                    <span className="opacity-80 group-hover:opacity-100 font-black">
                      {idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Solved Badge overlay when picture is completely solved */}
          {isCorrect && (
            <div className="absolute top-3 left-3 px-3.5 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-lg flex items-center gap-1.5 backdrop-blur-md animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>SOLVED - FULL PICTURE REVEALED</span>
            </div>
          )}

          {/* Zoom / Fullscreen Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              setShowImageZoom(true);
            }}
            className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md opacity-90 hover:opacity-100 transition-all shadow-md"
            title="Expand Full Picture"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Action under Image */}
        {!isCorrect && tilesRemainingCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 max-w-md sm:max-w-lg mx-auto">
            <button
              onClick={handleRevealRandomSquare}
              className="w-full py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
            >
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Reveal 1 Random Tile ({tilesRemainingCount} Covered)</span>
            </button>

            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center gap-1.5 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Reward: +{potentialReward} 🪙</span>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: NAME THE HIDDEN PICTURE (ANSWER SLOTS) - POSITIONED BELOW HIDDEN PICTURE */}
      <div className="p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-md space-y-4 text-center">
        
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Tag className="w-4 h-4" />
            Name The Hidden Picture
          </span>
          <span className="text-[11px] text-slate-400 font-extrabold">
            {answer.replace(/[^A-Z]/g, '').length} Letters
          </span>
        </div>

        {/* Answer Letter Boxes */}
        <div className="flex flex-wrap items-center justify-center gap-2 py-2">
          {answer.split('').map((char, index) => {
            const isLetter = /[A-Z]/.test(char);
            const val = answerSlots[index] || '';

            if (!isLetter) {
              return (
                <div key={`space-${index}`} className="w-4 h-12 flex items-center justify-center text-slate-400 font-black">
                  {char === ' ' ? '' : char}
                </div>
              );
            }

            return (
              <button
                key={`slot-${index}`}
                disabled={isCorrect}
                onClick={() => handleClearSlot(index)}
                className={`w-11 h-13 sm:w-13 sm:h-15 rounded-2xl font-black text-xl sm:text-2xl flex items-center justify-center shadow-xs transition-all transform active:scale-95 ${
                  isCorrect
                    ? 'bg-emerald-500 text-white border-2 border-emerald-400 shadow-emerald-200'
                    : val
                    ? 'bg-indigo-600 text-white border-2 border-indigo-500 shadow-indigo-200'
                    : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-transparent hover:border-indigo-400'
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: AVAILABLE LETTERS (LETTER BANK) - POSITIONED BELOW ANSWER SLOTS */}
      {!isCorrect && (
        <div className="p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-md space-y-4 text-center">
          <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
            <span className="text-indigo-600 dark:text-indigo-400 font-black">
              Available Letters
            </span>
            <span className="text-slate-400 text-[10px] font-bold">TAP LETTER TO PLACE</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {letterBank.map((tile) => (
              <button
                key={tile.id}
                disabled={tile.used}
                onClick={() => handleSelectBankTile(tile.id, tile.char)}
                className={`w-11 h-12 sm:w-13 sm:h-14 rounded-2xl font-black text-lg sm:text-2xl transition-all transform active:scale-90 ${
                  tile.used
                    ? 'opacity-20 scale-90 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 pointer-events-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:scale-105'
                }`}
              >
                {tile.char}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hint Alert Message */}
      {hintMessage && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold text-center animate-fade-in">
          💡 {hintMessage}
        </div>
      )}

      {/* SECTION 4: HINT & NAVIGATION ACTIONS */}
      {!isCorrect && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            onClick={handleHintRevealLetter}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-amber-300 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all shadow-xs"
          >
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>Reveal Letter</span>
            <span className="text-[10px] text-amber-600 font-black">15 🪙</span>
          </button>

          <button
            onClick={handleRandomQuestion}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-300 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all shadow-xs"
          >
            <Shuffle className="w-5 h-5 text-indigo-500" />
            <span>Shuffle Picture</span>
            <span className="text-[10px] text-slate-400 font-black">Free</span>
          </button>

          <button
            onClick={handleNextQuestion}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-slate-300 text-slate-500 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all shadow-xs col-span-2 sm:col-span-1"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180" />
            <span>Skip Picture</span>
            <span className="text-[10px] text-slate-400 font-black">Free</span>
          </button>
        </div>
      )}

      {/* SECTION 5: CORRECT ANSWER CELEBRATION CARD */}
      {isCorrect && (
        <div className="p-6 sm:p-8 rounded-[36px] bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 shadow-xl space-y-5 text-center animate-in zoom-in-95 duration-200">
          <div className="inline-flex p-4 rounded-full bg-emerald-500 text-white shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h3 className="font-black text-2xl sm:text-3xl text-emerald-900 dark:text-emerald-100 tracking-tight uppercase">
              PUZZLE SOLVED!
            </h3>
            <p className="font-black text-emerald-700 dark:text-emerald-300 text-2xl tracking-wider mt-1">
              {currentQuestion.correctAnswer}
            </p>
          </div>

          {/* Reward Metrics */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
            <div className="text-center">
              <span className="text-slate-500 text-[11px] block">Coins Earned</span>
              <span className="text-amber-600 dark:text-amber-400 text-xl font-black">+{coinsEarned} 🪙</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 text-[11px] block">Tiles Uncovered</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-xl font-black">{tilesRevealedCount} / {totalTiles}</span>
            </div>
          </div>

          {/* Trivia Fact */}
          {currentQuestion.triviaFact && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-left text-slate-700 dark:text-slate-200 text-sm space-y-1">
              <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Trivia Fact
              </div>
              <p className="leading-relaxed text-slate-600 dark:text-slate-300 font-medium text-xs">
                {currentQuestion.triviaFact}
              </p>
            </div>
          )}

          <button
            onClick={() => {
              soundFx.playClick();
              handleNextQuestion();
            }}
            className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-lg shadow-indigo-200 dark:shadow-none transition-all transform active:scale-98"
          >
            NEXT HIDDEN PICTURE →
          </button>
        </div>
      )}

      {/* Expanded Zoom Picture Modal */}
      {showImageZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-3 shadow-2xl flex flex-col items-center">
            <img
              src={currentQuestion.image}
              alt="Expanded Clue"
              className="w-full h-auto max-h-[75vh] object-contain rounded-2xl"
            />
            <div className="w-full mt-3 flex items-center justify-between text-xs text-slate-300 font-bold px-2">
              <span>{isCorrect ? currentQuestion.correctAnswer : 'Hidden Clue Zoom'}</span>
              <button
                onClick={() => setShowImageZoom(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs"
              >
                Close Zoom
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
