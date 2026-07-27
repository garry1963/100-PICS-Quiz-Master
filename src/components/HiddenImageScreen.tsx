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
  Info
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

    setRevealedTiles(new Array(gridSize * gridSize).fill(false));
    setIsCorrect(false);
    setHintMessage(null);

    const answer = currentQuestion.correctAnswer.toUpperCase();
    const lettersOnly = answer.replace(/[^A-Z]/g, '');

    // Answer slots matching total length
    setAnswerSlots(new Array(answer.length).fill(''));

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
        used: false
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
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
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
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      
      {/* Top Header & Gameplay Controls */}
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
                Hidden Image Puzzle
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-extrabold">
              Picture {currentQuestionIndex + 1} of {filteredQuestions.length}
            </p>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Pack Selector */}
          <select
            value={selectedPackId}
            onChange={(e) => {
              soundFx.playClick();
              setSelectedPackId(e.target.value);
              setCurrentQuestionIndex(0);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <option value="all">All Category Packs</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          {/* Grid Size Toggle */}
          <button
            onClick={() => {
              soundFx.playClick();
              setGridSize(gridSize === 4 ? 5 : 4);
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center gap-1"
            title="Toggle Grid Size"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>{gridSize}x{gridSize} ({totalTiles} tiles)</span>
          </button>

          {/* Coins Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-black text-xs">
            <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{user.coins}</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Covered Hidden Image Canvas */}
        <div className="md:col-span-5 flex flex-col items-center">
          
          <div className="relative w-full aspect-square max-w-sm bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-xs group select-none">
            
            {/* The Actual Hidden Image Underneath */}
            <img
              src={currentQuestion.image}
              alt="Hidden Quiz Clue"
              className="w-full h-full object-cover rounded-[26px]"
            />

            {/* Interactive Cover Grid Tiles Overlay */}
            <div
              className="absolute inset-0 grid gap-1 p-2 bg-slate-950/30 backdrop-blur-[1px]"
              style={{
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`
              }}
            >
              {revealedTiles.map((isRevealed, idx) => (
                <button
                  key={`tile-block-${idx}`}
                  disabled={isRevealed || isCorrect}
                  onClick={() => handleTileClick(idx)}
                  className={`relative rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition-all transform duration-300 ${
                    isRevealed
                      ? 'opacity-0 scale-75 pointer-events-none'
                      : 'bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-indigo-100 border-2 border-indigo-400/30 shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                  }`}
                >
                  {!isRevealed && (
                    <span className="opacity-80 group-hover:opacity-100 font-extrabold text-[11px]">
                      {idx + 1}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Picture Zoom Icon */}
            {isCorrect && (
              <button
                onClick={() => {
                  soundFx.playClick();
                  setShowImageZoom(true);
                }}
                className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md opacity-90 transition-opacity"
                title="Expand Picture"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Stats Bar under Canvas */}
          <div className="mt-3 w-full max-w-sm p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-extrabold text-slate-700 dark:text-slate-300">
                Revealed: <strong className="text-indigo-600 dark:text-indigo-400">{tilesRevealedCount}</strong> / {totalTiles}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>Reward: +{potentialReward} 🪙</span>
            </div>
          </div>

          {/* Action: Tap 1 Square Quick Button */}
          {!isCorrect && tilesRemainingCount > 0 && (
            <button
              onClick={handleRevealRandomSquare}
              className="mt-2.5 w-full max-w-sm py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Zap className="w-4 h-4" />
              <span>Tap Random Block ({tilesRemainingCount} Covered)</span>
            </button>
          )}
        </div>

        {/* Right Column: Guessing Word & Letter Bank */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Answer Letter Boxes */}
          <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400 block text-center">
              NAME THE HIDDEN PICTURE
            </span>

            <div className="flex flex-wrap items-center justify-center gap-2 py-2">
              {answer.split('').map((char, index) => {
                const isLetter = /[A-Z]/.test(char);
                const val = answerSlots[index] || '';

                if (!isLetter) {
                  return (
                    <div key={`space-${index}`} className="w-4 h-12 flex items-center justify-center text-slate-400 font-bold">
                      {char === ' ' ? '' : char}
                    </div>
                  );
                }

                return (
                  <button
                    key={`slot-${index}`}
                    onClick={() => handleClearSlot(index)}
                    className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl font-black text-xl sm:text-2xl flex items-center justify-center shadow-xs transition-all transform active:scale-95 ${
                      isCorrect
                        ? 'bg-emerald-500 text-white border-2 border-emerald-400 shadow-emerald-200'
                        : val
                        ? 'bg-indigo-600 text-white border-2 border-indigo-500 shadow-indigo-200'
                        : 'bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-transparent'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Letter Bank Tile Grid */}
          {!isCorrect && (
            <div className="p-6 rounded-[28px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-500">
                <span>AVAILABLE LETTERS</span>
                <span className="text-slate-400 text-[10px]">TAP TO PLACE</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {letterBank.map((tile) => (
                  <button
                    key={tile.id}
                    disabled={tile.used}
                    onClick={() => handleSelectBankTile(tile.id, tile.char)}
                    className={`w-11 h-12 sm:w-12 sm:h-13 rounded-2xl font-black text-lg sm:text-xl transition-all transform active:scale-90 ${
                      tile.used
                        ? 'opacity-20 scale-90 bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 pointer-events-none'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    {tile.char}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hint Banner */}
          {hintMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold text-center animate-fade-in">
              💡 {hintMessage}
            </div>
          )}

          {/* Hint / Skip Action Bar */}
          {!isCorrect && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <button
                onClick={handleHintRevealLetter}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-amber-300 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all"
              >
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <span>Reveal Letter</span>
                <span className="text-[10px] text-amber-600 font-bold">15 🪙</span>
              </button>

              <button
                onClick={handleRandomQuestion}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-300 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all"
              >
                <Shuffle className="w-4 h-4 text-indigo-500" />
                <span>Shuffle Picture</span>
                <span className="text-[10px] text-slate-400 font-bold">Free</span>
              </button>

              <button
                onClick={handleNextQuestion}
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-slate-300 text-slate-500 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all col-span-2 sm:col-span-1"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400 rotate-180" />
                <span>Skip Picture</span>
                <span className="text-[10px] text-slate-400 font-bold">Free</span>
              </button>
            </div>
          )}

          {/* Correct Answer Celebration Card */}
          {isCorrect && (
            <div className="p-6 sm:p-8 rounded-[32px] bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 shadow-xs space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="inline-flex p-3.5 rounded-full bg-emerald-500 text-white shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-black text-2xl text-emerald-900 dark:text-emerald-100 tracking-tight uppercase">
                  PUZZLE SOLVED!
                </h3>
                <p className="font-black text-emerald-700 dark:text-emerald-300 text-xl tracking-wider mt-1">
                  {currentQuestion.correctAnswer}
                </p>
              </div>

              {/* Reward Breakdown */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                <div className="text-center">
                  <span className="text-slate-500 text-[11px] block">Coins Earned</span>
                  <span className="text-amber-600 dark:text-amber-400 text-lg font-black">+{coinsEarned} 🪙</span>
                </div>
                <div className="text-center">
                  <span className="text-slate-500 text-[11px] block">Tiles Uncovered</span>
                  <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black">{tilesRevealedCount} / {totalTiles}</span>
                </div>
              </div>

              {/* Trivia Fact */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-left text-slate-700 dark:text-slate-200 text-sm space-y-1">
                <div className="flex items-center gap-2 font-black text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Trivia Fact
                </div>
                <p className="leading-relaxed text-slate-600 dark:text-slate-300 font-medium text-xs">
                  {currentQuestion.triviaFact}
                </p>
              </div>

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

        </div>
      </div>

      {/* Expanded Picture Modal */}
      {showImageZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-2">
            <img
              src={currentQuestion.image}
              alt="Expanded Clue"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setShowImageZoom(false)}
              className="absolute top-4 right-4 px-4 py-2 rounded-2xl bg-slate-950/80 text-white font-black text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
