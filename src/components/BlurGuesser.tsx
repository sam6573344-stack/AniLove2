import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Trophy,
  Flame,
  CheckCircle2,
  XCircle,
  ArrowRight,
  HelpCircle,
  Tv,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Anime } from '../types';
import { soundEffects } from '../services/soundEffects';

interface BlurGuesserProps {
  animePool: Anime[];
  onOpenDetails?: (anime: Anime) => void;
}

interface GuessRound {
  target: Anime;
  options: {
    anime: Anime;
    title: string;
    isCorrect: boolean;
  }[];
}

export const BlurGuesser: React.FC<BlurGuesserProps> = ({ animePool, onOpenDetails }) => {
  const [currentRound, setCurrentRound] = useState<GuessRound | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [bestStreak, setBestStreak] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('anilove_blur_best_streak') || '0', 10) || 0;
    } catch {
      return 0;
    }
  });
  const [roundsPlayed, setRoundsPlayed] = useState<number>(0);

  // Helper to extract a display title
  const getTitle = (anime: Anime): string => {
    return (
      anime.title.english ||
      anime.title.userPreferred ||
      anime.title.romaji ||
      'Anime'
    );
  };

  // Generate a new round from the anime pool
  const generateNewRound = useCallback(() => {
    if (!animePool || animePool.length < 4) return;

    // Pick random target
    const targetIdx = Math.floor(Math.random() * animePool.length);
    const target = animePool[targetIdx];
    const targetTitle = getTitle(target);

    // Pick 3 random distinct distractors
    const distractors: Anime[] = [];
    const poolCopy = animePool.filter(a => a.id !== target.id);
    
    while (distractors.length < 3 && poolCopy.length > 0) {
      const randIdx = Math.floor(Math.random() * poolCopy.length);
      const chosen = poolCopy.splice(randIdx, 1)[0];
      // Ensure distinct title
      if (!distractors.some(d => getTitle(d) === getTitle(chosen)) && getTitle(chosen) !== targetTitle) {
        distractors.push(chosen);
      }
    }

    // Combine and shuffle options
    const allOptions = [
      { anime: target, title: targetTitle, isCorrect: true },
      ...distractors.map(d => ({ anime: d, title: getTitle(d), isCorrect: false })),
    ];

    // Fisher-Yates shuffle
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }

    setCurrentRound({
      target,
      options: allOptions,
    });
    setSelectedIndex(null);
    setIsAnswered(false);
    setHintUsed(false);
  }, [animePool]);

  // Initial load
  useEffect(() => {
    if (animePool && animePool.length >= 4 && !currentRound) {
      generateNewRound();
    }
  }, [animePool, currentRound, generateNewRound]);

  // Handle option click
  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentRound) return;

    setSelectedIndex(index);
    setIsAnswered(true);
    setRoundsPlayed(prev => prev + 1);

    const isCorrect = currentRound.options[index].isCorrect;

    if (isCorrect) {
      soundEffects.playQuizCorrect();
      const nextScore = score + (hintUsed ? 1 : 2);
      setScore(nextScore);

      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) {
        setBestStreak(nextStreak);
        try {
          localStorage.setItem('anilove_blur_best_streak', nextStreak.toString());
        } catch {
          // ignore
        }
      }

      if (nextStreak % 3 === 0) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } else {
      soundEffects.playQuizWrong();
      setStreak(0);
    }
  };

  const handleNextRound = () => {
    soundEffects.playClick();
    generateNewRound();
  };

  const handleUseHint = () => {
    if (hintUsed || isAnswered) return;
    soundEffects.playClick();
    setHintUsed(true);
  };

  if (!currentRound) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading anime image challenge...</p>
      </div>
    );
  }

  const { target, options } = currentRound;
  const imageSrc =
    target.bannerImage || target.coverImage.extraLarge || target.coverImage.large || target.coverImage.medium;

  return (
    <div className="space-y-6">
      {/* Top Game Bar & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Guess the Anime</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Blurred Visual MCQ
              </span>
            </h2>
            <p className="text-xs text-slate-400">Identify the anime hidden beneath the blur filter!</p>
          </div>
        </div>

        {/* Score & Streak Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-slate-400">Streak:</span>
            <span className="font-extrabold text-amber-300">{streak}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-slate-400">Best:</span>
            <span className="font-extrabold text-yellow-300">{bestStreak}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center gap-2 text-xs">
            <Zap className="w-4 h-4 text-pink-400" />
            <span className="text-slate-300">Score:</span>
            <span className="font-extrabold text-pink-300">{score}</span>
          </div>
        </div>
      </div>

      {/* Main Game Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Blurred Image Canvas (Left / Top) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-white/15 aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center group shadow-2xl">
            {/* Background image with dynamic blur filter */}
            <motion.img
              key={target.id}
              src={imageSrc}
              alt="Blurred mystery anime"
              className="w-full h-full object-cover select-none transition-all duration-700 ease-out"
              style={{
                filter: isAnswered
                  ? 'blur(0px) brightness(1)'
                  : hintUsed
                  ? 'blur(8px) brightness(0.85)'
                  : 'blur(22px) brightness(0.75)',
                transform: isAnswered ? 'scale(1)' : 'scale(1.12)',
              }}
              draggable={false}
            />

            {/* Subtle Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />

            {/* Mystery Badge or Unblur Banner */}
            <div className="absolute top-4 left-4 z-10">
              <AnimatePresence mode="wait">
                {!isAnswered ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/20 text-xs font-bold text-slate-200 shadow-xl"
                  >
                    <EyeOff className="w-3.5 h-3.5 text-pink-400" />
                    <span>Can you recognize this?</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-extrabold shadow-xl ${
                      options[selectedIndex || 0]?.isCorrect
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-500/60 text-rose-300'
                    }`}
                  >
                    {options[selectedIndex || 0]?.isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>CORRECT REVEAL</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>MISSED REVEAL</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hint Trigger Button (bottom-right of image) */}
            {!isAnswered && (
              <div className="absolute bottom-4 right-4 z-10">
                <button
                  disabled={hintUsed}
                  onClick={handleUseHint}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer backdrop-blur-md border shadow-lg ${
                    hintUsed
                      ? 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-950/80 hover:bg-slate-900 border-white/20 text-amber-300 hover:text-amber-200 hover:scale-105 active:scale-95'
                  }`}
                  title={hintUsed ? 'Hint already active' : 'Partially reduce blur for a clearer peek (+1 pt instead of +2)'}
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>{hintUsed ? 'Hint Active (-50% Blur)' : 'Use Hint (Peek)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Genre / Format Info after reveal */}
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-4"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                  Featured Anime
                </span>
                <h3 className="text-base font-extrabold text-white truncate max-w-sm sm:max-w-md">
                  {getTitle(target)}
                </h3>
                <p className="text-xs text-slate-400">{target.genres.slice(0, 3).join(' • ')}</p>
              </div>

              {onOpenDetails && (
                <button
                  onClick={() => onOpenDetails(target)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 text-pink-400" />
                  <span>View Details</span>
                </button>
              )}
            </motion.div>
          )}
        </div>

        {/* 4 MCQ Answer Options (Right / Bottom) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>Select the matching Anime:</span>
            </h3>
            <p className="text-xs text-slate-400">
              Pick the right title from the 4 options below to score points and maintain your streak!
            </p>
          </div>

          <div className="space-y-2.5">
            {options.map((option, idx) => {
              const isSelected = selectedIndex === idx;
              const isCorrect = option.isCorrect;

              let btnStyle =
                'bg-slate-900/80 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-pink-500/50 hover:text-white';

              if (isAnswered) {
                if (isCorrect) {
                  btnStyle =
                    'bg-emerald-500/20 border-emerald-500/70 text-emerald-200 font-extrabold shadow-lg shadow-emerald-500/20';
                } else if (isSelected && !isCorrect) {
                  btnStyle =
                    'bg-rose-500/20 border-rose-500/70 text-rose-200 font-extrabold shadow-lg shadow-rose-500/20';
                } else {
                  btnStyle = 'bg-slate-950/50 border-slate-900 text-slate-500 opacity-40';
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={!isAnswered ? { scale: 1.01 } : {}}
                  whileTap={!isAnswered ? { scale: 0.99 } : {}}
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-7 h-7 rounded-xl bg-white/10 text-xs font-black flex items-center justify-center shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="truncate leading-snug">{option.title}</span>
                  </div>

                  {isAnswered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Next Round Button */}
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-2"
            >
              <button
                onClick={handleNextRound}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-extrabold text-sm shadow-xl shadow-pink-500/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <span>Next Anime Challenge</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
