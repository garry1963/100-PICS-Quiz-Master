import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Coins,
  Lightbulb,
  Eraser,
  Eye,
  SkipForward,
  Heart,
  Maximize2,
  X,
  Sparkles,
  Trophy,
  CheckCircle2,
  HelpCircle,
  Share2,
  Info
} from 'lucide-react';
import { QuizPack, Question, PlayerPackProgress, UserProfile } from '../types';
import { soundFx } from '../lib/sound';
import { dbStore } from '../lib/storage';

interface QuizPlayerScreenProps {
  pack: QuizPack;
  questions: Question[];
  user: UserProfile;
  onUpdateUser: (updated: UserProfile) => void;
  onBack: () => void;
  onCompletePack: (packId: string) => void;
}

export const QuizPlayerScreen: React.FC<QuizPlayerScreenProps> = ({
  pack,
  questions,
  user,
  onUpdateUser,
  onBack,
  onCompletePack,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userGuess, setUserGuess] = useState<string[]>([]);
  const [letterBank, setLetterBank] = useState<{ id: string; char: string; used: boolean }[]>([]);
  const [removedDistractors, setRemovedDistractors] = useState<string[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<number[]>([]);
  
  const [isCorrect, setIsCorrect] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [isFavourite, setIsFavourite] = useState(false);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  const currentQuestion: Question | undefined = questions[currentQuestionIndex];

  // Target Answer processing (e.g. "EIFFEL TOWER")
  const targetAnswer = currentQuestion ? currentQuestion.correctAnswer.toUpperCase() : '';
  const isAlpha = (ch: string) => /[A-Z]/.test(ch);

  // Group targetAnswer into words to ensure complete words wrap onto new lines
  const wordGroups = useMemo(() => {
    if (!targetAnswer) return [];

    const groups: Array<{
      id: string;
      isSpace: boolean;
      items: Array<{ char: string; index: number }>;
    }> = [];

    let currentWord: Array<{ char: string; index: number }> = [];

    targetAnswer.split('').forEach((char, index) => {
      if (char === ' ') {
        if (currentWord.length > 0) {
          groups.push({
            id: `word-${groups.length}-${index}`,
            isSpace: false,
            items: currentWord,
          });
          currentWord = [];
        }
        groups.push({
          id: `space-${index}`,
          isSpace: true,
          items: [{ char: ' ', index }],
        });
      } else {
        currentWord.push({ char, index });
      }
    });

    if (currentWord.length > 0) {
      groups.push({
        id: `word-${groups.length}-${targetAnswer.length}`,
        isSpace: false,
        items: currentWord,
      });
    }

    return groups;
  }, [targetAnswer]);

  // Initialize Favourite status
  useEffect(() => {
    setIsFavourite(dbStore.getFavouritePackIds().includes(pack.id));
  }, [pack.id]);

  // Load progress for this pack
  useEffect(() => {
    const progress = dbStore.getPackProgress(pack.id);
    if (progress && progress.currentQuestionIndex < questions.length) {
      setCurrentQuestionIndex(progress.currentQuestionIndex);
    }
  }, [pack.id, questions.length]);

  // Setup current question state
  const setupQuestionState = useCallback((q: Question) => {
    setIsCorrect(false);
    setIsWrong(false);
    setHintMessage(null);
    setRemovedDistractors([]);
    setRevealedIndices([]);

    const cleanAnswer = q.correctAnswer.toUpperCase();
    const answerChars = cleanAnswer.split('');

    // Pre-fill guess slots with empty strings for letters, or exact punctuation/spaces
    const initialGuess = answerChars.map(ch => (isAlpha(ch) ? '' : ch));
    setUserGuess(initialGuess);

    // Create Letter Bank: target letters + distractor letters
    const targetLettersOnly = answerChars.filter(isAlpha);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const distractorCount = Math.max(14 - targetLettersOnly.length, 4);

    const distractorLetters: string[] = [];
    for (let i = 0; i < distractorCount; i++) {
      const randChar = alphabet[Math.floor(Math.random() * alphabet.length)];
      distractorLetters.push(randChar);
    }

    const combinedPool = [...targetLettersOnly, ...distractorLetters];
    // Fisher-Yates shuffle
    for (let i = combinedPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combinedPool[i], combinedPool[j]] = [combinedPool[j], combinedPool[i]];
    }

    setLetterBank(
      combinedPool.map((char, idx) => ({
        id: `tile-${idx}-${char}`,
        char,
        used: false
      }))
    );
  }, []);

  useEffect(() => {
    if (currentQuestion) {
      setupQuestionState(currentQuestion);
    }
  }, [currentQuestionIndex, currentQuestion, setupQuestionState]);

  // Check Answer Function
  const checkAnswer = useCallback((guessArray: string[]) => {
    if (!currentQuestion) return;

    const fullGuess = guessArray.join('').trim().toUpperCase();
    const cleanTarget = targetAnswer.trim().toUpperCase();

    const alts = (currentQuestion.alternativeAcceptedAnswers || []).map(a => a.trim().toUpperCase());
    const isMatch = fullGuess === cleanTarget || alts.includes(fullGuess);

    if (isMatch) {
      setIsCorrect(true);
      setIsWrong(false);
      soundFx.playCorrect();

      // Confetti burst
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Update User XP & Coins
      const coinGain = 10;
      const xpGain = 25;

      const updatedUser: UserProfile = {
        ...user,
        coins: user.coins + coinGain,
        xp: user.xp + xpGain,
        level: Math.floor((user.xp + xpGain) / 100) + 1
      };
      onUpdateUser(updatedUser);

      // Save Pack Progress
      const progress = dbStore.getPackProgress(pack.id);
      const updatedCompleted = Array.from(new Set([...progress.completedQuestions, currentQuestion.id]));
      const completionPct = Math.round((updatedCompleted.length / pack.totalQuestions) * 100);

      const updatedProgress: PlayerPackProgress = {
        ...progress,
        completedQuestions: updatedCompleted,
        currentQuestionIndex: Math.min(currentQuestionIndex + 1, questions.length - 1),
        completionPercentage: completionPct,
        starsEarned: completionPct >= 100 ? 3 : completionPct >= 50 ? 2 : 1
      };
      dbStore.savePackProgress(updatedProgress);

      if (completionPct >= 100) {
        setTimeout(() => {
          confetti({ particleCount: 120, angle: 60, spread: 55, origin: { x: 0 } });
          confetti({ particleCount: 120, angle: 120, spread: 55, origin: { x: 1 } });
        }, 300);
      }

    } else {
      setIsWrong(true);
      soundFx.playWrong();
      setTimeout(() => setIsWrong(false), 800);
    }
  }, [currentQuestion, targetAnswer, user, onUpdateUser, pack, currentQuestionIndex, questions.length]);

  // Tap Letter Tile from Bank
  const handleSelectBankTile = (tileId: string, char: string) => {
    if (isCorrect) return;

    // Find first empty slot that is alpha
    const nextSlotIndex = userGuess.findIndex((val, idx) => isAlpha(targetAnswer[idx]) && val === '');
    if (nextSlotIndex === -1) return;

    soundFx.playPop();

    const newGuess = [...userGuess];
    newGuess[nextSlotIndex] = char;
    setUserGuess(newGuess);

    setLetterBank(prev =>
      prev.map(tile => (tile.id === tileId ? { ...tile, used: true } : tile))
    );

    // Check if fully filled
    const isFullyFilled = newGuess.every((val, idx) => !isAlpha(targetAnswer[idx]) || val !== '');
    if (isFullyFilled) {
      checkAnswer(newGuess);
    }
  };

  // Tap Filled Slot to Remove Letter
  const handleClearSlot = (slotIndex: number) => {
    if (isCorrect) return;
    if (revealedIndices.includes(slotIndex)) return; // Locked hint letter

    const charToRemove = userGuess[slotIndex];
    if (!charToRemove || !isAlpha(targetAnswer[slotIndex])) return;

    soundFx.playClick();

    const newGuess = [...userGuess];
    newGuess[slotIndex] = '';
    setUserGuess(newGuess);

    // Free the tile in bank
    setLetterBank(prev => {
      const idx = prev.findIndex(tile => tile.char === charToRemove && tile.used);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], used: false };
        return copy;
      }
      return prev;
    });
  };

  // Keyboard handler for desktop/tablet physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCorrect || !currentQuestion) return;

      const key = e.key.toUpperCase();

      if (isAlpha(key) && key.length === 1) {
        // Find available tile in bank
        const availableTile = letterBank.find(tile => tile.char === key && !tile.used && !removedDistractors.includes(tile.id));
        if (availableTile) {
          handleSelectBankTile(availableTile.id, availableTile.char);
        }
      } else if (e.key === 'Backspace') {
        // Clear last filled non-revealed slot
        for (let i = userGuess.length - 1; i >= 0; i--) {
          if (isAlpha(targetAnswer[i]) && userGuess[i] !== '' && !revealedIndices.includes(i)) {
            handleClearSlot(i);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [letterBank, userGuess, isCorrect, currentQuestion, targetAnswer, revealedIndices, removedDistractors]);

  // HINT 1: Reveal Random Letter (15 Coins)
  const handleHintRevealLetter = () => {
    if (user.coins < 15) {
      soundFx.playWrong();
      setHintMessage('Not enough coins! Earn more by solving pictures.');
      return;
    }

    // Find unrevealed indices
    const unrevealed = targetAnswer
      .split('')
      .map((ch, idx) => (isAlpha(ch) && userGuess[idx] !== ch ? idx : -1))
      .filter(idx => idx !== -1);

    if (unrevealed.length === 0) return;

    soundFx.playHint();
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const correctChar = targetAnswer[randomIndex];

    // Deduct coins
    onUpdateUser({ ...user, coins: user.coins - 15 });

    const newGuess = [...userGuess];
    newGuess[randomIndex] = correctChar;
    setUserGuess(newGuess);
    setRevealedIndices(prev => [...prev, randomIndex]);

    // Mark corresponding tile in bank
    setLetterBank(prev => {
      const idx = prev.findIndex(t => t.char === correctChar && !t.used);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], used: true };
        return copy;
      }
      return prev;
    });

    setHintMessage(`Revealed letter "${correctChar}"! (-15 coins)`);

    // Check if finished
    const isFullyFilled = newGuess.every((val, idx) => !isAlpha(targetAnswer[idx]) || val !== '');
    if (isFullyFilled) {
      checkAnswer(newGuess);
    }
  };

  // HINT 2: Remove Distractor Letters (20 Coins)
  const handleHintRemoveDistractors = () => {
    if (user.coins < 20) {
      soundFx.playWrong();
      setHintMessage('Not enough coins for this hint!');
      return;
    }

    soundFx.playHint();
    onUpdateUser({ ...user, coins: user.coins - 20 });

    const targetChars = targetAnswer.split('');
    const distractors = letterBank.filter(tile => !tile.used && !targetChars.includes(tile.char));

    const toRemoveIds = distractors.slice(0, 4).map(d => d.id);
    setRemovedDistractors(prev => [...prev, ...toRemoveIds]);

    setHintMessage('Removed 4 incorrect letters! (-20 coins)');
  };

  // HINT 3: Reveal Full Word (50 Coins)
  const handleHintRevealWord = () => {
    if (user.coins < 50) {
      soundFx.playWrong();
      setHintMessage('50 coins required to solve word!');
      return;
    }

    soundFx.playHint();
    onUpdateUser({ ...user, coins: user.coins - 50 });

    const solvedArray = targetAnswer.split('');
    setUserGuess(solvedArray);
    checkAnswer(solvedArray);
  };

  // HINT 4: Skip Question (30 Coins)
  const handleSkipQuestion = () => {
    if (user.coins < 30) {
      soundFx.playWrong();
      setHintMessage('30 coins needed to skip question.');
      return;
    }

    soundFx.playClick();
    onUpdateUser({ ...user, coins: user.coins - 30 });
    handleNextQuestion();
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Pack Completed!
      soundFx.playCorrect();
      onCompletePack(pack.id);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="p-12 text-center text-slate-300">
        <p className="text-lg">No questions available in this pack.</p>
        <button onClick={onBack} className="mt-4 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
          Back to Packs
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-5 box-border overflow-x-hidden">
      
      {/* Top Gameplay Bar */}
      <div className="w-full flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs text-slate-800 dark:text-slate-100 min-w-0 box-border overflow-hidden">
        <button
          id="quiz-back-btn"
          onClick={() => {
            soundFx.playClick();
            onBack();
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Packs</span>
        </button>

        <div className="text-center min-w-0 flex-1 px-2">
          <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight">
            {pack.title}
          </h2>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold truncate">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Favourite Heart */}
          <button
            id="favourite-pack-btn"
            onClick={() => {
              soundFx.playClick();
              const newState = dbStore.toggleFavouritePack(pack.id);
              setIsFavourite(newState);
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Toggle Favourite"
          >
            <Heart className={`w-4 h-4 ${isFavourite ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
          </button>

          {/* Coins Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-black text-xs">
            <Coins className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{user.coins}</span>
          </div>
        </div>
      </div>

      {/* Main Single Column Layout: Picture -> Clue -> Word -> Keyboard */}
      <div className="w-full space-y-5">
        
        {/* 1. PICTURE: QUIZ CLUE IMAGE */}
        <div className="flex flex-col items-center bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-4 sm:p-6 shadow-md">
          <div className="relative w-full aspect-square max-w-md mx-auto bg-slate-950 border-4 border-slate-200 dark:border-slate-800 rounded-[28px] overflow-hidden shadow-xl group select-none">
            <img
              src={currentQuestion.image}
              alt="Quiz clue picture"
              className={`w-full h-full object-cover transition-all duration-300 ${
                isWrong ? 'animate-shake' : ''
              }`}
            />

            {/* Expand Zoom Overlay Trigger */}
            <button
              id="expand-image-btn"
              onClick={() => {
                soundFx.playClick();
                setShowImageZoom(true);
              }}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md opacity-90 transition-opacity"
              title="Expand Picture"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Copyright/Credit Tag */}
            {currentQuestion.imageCredit && (
              <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-[10px] text-slate-300 truncate backdrop-blur-sm font-medium">
                📷 {currentQuestion.imageCredit}
              </div>
            )}
          </div>
        </div>

        {/* 2. CLUE: TEXT CLUE & HINT ACTIONS */}
        {/* Text Clue / Hint Bar */}
        {currentQuestion.hint && (
          <div className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="italic">Clue: {currentQuestion.hint}</span>
          </div>
        )}

        {/* Hint Message Banner */}
        {hintMessage && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold text-center animate-fade-in">
            💡 {hintMessage}
          </div>
        )}

        {/* Hint Action Bar */}
        {!isCorrect && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              id="hint-reveal-letter-btn"
              onClick={handleHintRevealLetter}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-amber-300 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Reveal Letter</span>
              <span className="text-[10px] text-amber-600 font-bold">15 🪙</span>
            </button>

            <button
              id="hint-remove-distractor-btn"
              onClick={handleHintRemoveDistractors}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-300 text-slate-700 dark:text-slate-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Eraser className="w-4 h-4 text-indigo-500" />
              <span>Remove 4</span>
              <span className="text-[10px] text-slate-400 font-bold">20 🪙</span>
            </button>

            <button
              id="hint-solve-word-btn"
              onClick={handleHintRevealWord}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-300 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Reveal Word</span>
              <span className="text-[10px] text-indigo-600/80 font-bold">50 🪙</span>
            </button>

            <button
              id="hint-skip-question-btn"
              onClick={handleSkipQuestion}
              className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 hover:border-slate-300 text-slate-500 font-extrabold text-xs flex flex-col items-center justify-center gap-1 transition-all"
            >
              <SkipForward className="w-4 h-4 text-slate-400" />
              <span>Skip Pic</span>
              <span className="text-[10px] text-slate-400 font-bold">30 🪙</span>
            </button>
          </div>
        )}

        {/* 3. WORD: ANSWER SLOTS */}
        <div className="p-5 sm:p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-md space-y-3 text-center">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block text-center">
            Word Answer
          </span>

          {/* Word Slots Grid */}
          <div className="flex flex-wrap items-center justify-center gap-y-3 min-h-[60px] py-1 max-w-full">
            {wordGroups.map((group) => {
              if (group.isSpace) {
                return (
                  <div key={group.id} className="w-2 sm:w-3 h-12 flex items-center justify-center shrink-0" />
                );
              }

              return (
                <div key={group.id} className="flex flex-nowrap items-center justify-center gap-1.5 sm:gap-2 shrink-0 max-w-full">
                  {group.items.map(({ char, index }) => {
                    const isLetter = isAlpha(char);
                    const val = userGuess[index] || '';
                    const isRevealed = revealedIndices.includes(index);

                    if (!isLetter) {
                      // Punctuation divider
                      return (
                        <div key={`punc-${index}`} className="w-4 h-12 flex items-center justify-center text-slate-400 font-bold">
                          {char}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={`slot-${index}`}
                        onClick={() => handleClearSlot(index)}
                        className={`w-10 h-12 sm:w-13 sm:h-15 rounded-2xl font-black text-lg sm:text-2xl flex items-center justify-center shadow-xs transition-all transform active:scale-95 ${
                          isCorrect
                            ? 'bg-emerald-500 text-white border-2 border-emerald-400 shadow-emerald-200'
                            : isRevealed
                            ? 'bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-400 text-amber-700 dark:text-amber-300'
                            : val
                            ? 'bg-indigo-600 text-white border-2 border-indigo-500 shadow-indigo-200'
                            : 'bg-slate-50 dark:bg-slate-800/90 border-2 border-indigo-400 dark:border-indigo-500 shadow-xs text-slate-800 dark:text-slate-100 hover:border-indigo-500'
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. KEYBOARD: AVAILABLE LETTERS (POSITIONED DIRECTLY BELOW WORD) */}
        {!isCorrect && (
          <div className="p-5 sm:p-6 rounded-[32px] bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-md space-y-3 text-center">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
              <span className="text-indigo-600 dark:text-indigo-400 font-black flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Keyboard (Available Letters)
              </span>
              <span className="text-slate-400 text-[10px] font-bold">TAP LETTER TO PLACE</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {letterBank
                .filter(tile => !removedDistractors.includes(tile.id))
                .map(tile => (
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

        {/* Correct Answer Celebration & Trivia Card */}
        {isCorrect && (
          <div className="p-6 sm:p-8 rounded-[32px] bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-300 dark:border-emerald-800 shadow-xs space-y-4 text-center">
            <div className="inline-flex p-3.5 rounded-full bg-emerald-500 text-white shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-black text-2xl text-emerald-900 dark:text-emerald-100 tracking-tight uppercase">CORRECT ANSWER!</h3>
              <p className="font-black text-emerald-700 dark:text-emerald-300 text-xl tracking-wider mt-1">
                {currentQuestion.correctAnswer}
              </p>
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

            {/* Next Question Button */}
            <button
              id="next-question-btn"
              onClick={() => {
                soundFx.playClick();
                handleNextQuestion();
              }}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base shadow-lg shadow-indigo-200 dark:shadow-none transition-all transform active:scale-98"
            >
              {currentQuestionIndex + 1 < questions.length ? 'NEXT QUESTION →' : 'FINISH PACK 🎉'}
            </button>
          </div>
        )}

      </div>

      {/* Image Zoom Modal */}
      {showImageZoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden p-2 shadow-2xl">
            <button
              onClick={() => setShowImageZoom(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-950/80 text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={currentQuestion.image}
              alt="Zoomed quiz picture"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
