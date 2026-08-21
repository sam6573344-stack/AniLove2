import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  Trophy,
  Quote,
  Dice5,
  EyeOff,
  Swords,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Flame,
} from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { Anime } from '../types';
import { fetchTrendingAnime, searchAnimeAdvanced } from '../services/anilist';
import { soundEffects } from '../services/soundEffects';
import { TierListMaker } from './TierListMaker';
import { BlurGuesser } from './BlurGuesser';
import { HigherLowerGame } from './HigherLowerGame';
import { CharacterGacha } from './CharacterGacha';

interface ArcadeViewProps {
  onOpenDetails?: (anime: Anime) => void;
  onNavigateToLibrary?: () => void;
}

type ArcadeSubTab = 'blur' | 'higherlower' | 'gacha' | 'tierlist' | 'quotes';

interface QuoteItem {
  id: number;
  quote: string;
  character: string;
  anime: string;
  options: string[];
  correctIndex: number;
  context: string;
}

const FAMOUS_QUOTES: QuoteItem[] = [
  {
    id: 1,
    quote: "Throughout heaven and earth, I alone am the honored one.",
    character: "Satoru Gojo",
    anime: "Jujutsu Kaisen",
    options: ["Sukuna", "Satoru Gojo", "Suguru Geto", "Megumi Fushiguro"],
    correctIndex: 1,
    context: "Said during the Hidden Inventory arc after awakening the Reverse Cursed Technique against Toji Fushiguro."
  },
  {
    id: 2,
    quote: "I'll take a potato chip... AND EAT IT!",
    character: "Light Yagami",
    anime: "Death Note",
    options: ["L Lawliet", "Light Yagami", "Ryuk", "Near"],
    correctIndex: 1,
    context: "One of the most iconic dramatic monologue moments in anime history while being wiretapped by L."
  },
  {
    id: 3,
    quote: "People die when they are killed...",
    character: "Shirou Emiya",
    anime: "Fate/stay night",
    options: ["Gilgamesh", "Archer", "Shirou Emiya", "Kiritsugu Emiya"],
    correctIndex: 2,
    context: "Shirou explaining his philosophy on returning Avalon to Saber in Fate/stay night."
  },
  {
    id: 4,
    quote: "Whatever happens, happens.",
    character: "Spike Spiegel",
    anime: "Cowboy Bebop",
    options: ["Spike Spiegel", "Jet Black", "Vicious", "Faye Valentine"],
    correctIndex: 0,
    context: "Spike's laid-back yet fatalistic life credo as a space bounty hunter."
  },
  {
    id: 5,
    quote: "If you don't take risks, you can't create a future!",
    character: "Monkey D. Luffy",
    anime: "One Piece",
    options: ["Roronoa Zoro", "Monkey D. Luffy", "Gol D. Roger", "Portgas D. Ace"],
    correctIndex: 1,
    context: "Luffy encouraging his crewmates during life-or-death challenges on the Grand Line."
  },
  {
    id: 6,
    quote: "A lesson without pain is meaningless. For you cannot gain something without sacrificing something else in return.",
    character: "Edward Elric",
    anime: "Fullmetal Alchemist: Brotherhood",
    options: ["Roy Mustang", "Alphonse Elric", "Edward Elric", "Van Hohenheim"],
    correctIndex: 2,
    context: "The core foundational closing reflection of the Equivalent Exchange law."
  },
  {
    id: 7,
    quote: "It is the courage to stand up and face the unknown that makes us truly alive.",
    character: "Frieren",
    anime: "Frieren: Beyond Journey's End",
    options: ["Himmel", "Frieren", "Fern", "Eisen"],
    correctIndex: 1,
    context: "Frieren reminiscing on Himmel the Hero's teachings as she journeys to Ende."
  },
  {
    id: 8,
    quote: "If you win, you live. If you lose, you die. If you don't fight, you can't win!",
    character: "Eren Yeager",
    anime: "Attack on Titan",
    options: ["Levi Ackerman", "Erwin Smith", "Eren Yeager", "Mikasa Ackerman"],
    correctIndex: 2,
    context: "Eren's defining rallying cry for personal freedom and survival."
  },
  {
    id: 9,
    quote: "Wake up to reality! Nothing ever goes as planned in this accursed world.",
    character: "Madara Uchiha",
    anime: "Naruto Shippuden",
    options: ["Itachi Uchiha", "Madara Uchiha", "Obito Uchiha", "Pain / Nagato"],
    correctIndex: 1,
    context: "Madara's nihilistic speech outlining the Infinite Tsukuyomi plan to bring permanent peace."
  },
  {
    id: 10,
    quote: "I don't care if this is the end. So, I'll use everything.",
    character: "Gon Freecss",
    anime: "Hunter x Hunter",
    options: ["Killua Zoldyck", "Kurapika", "Gon Freecss", "Hisoka Morow"],
    correctIndex: 2,
    context: "Gon sacrificing all his future Nen and potential to defeat Neferpitou in the Chimera Ant arc."
  }
];

export const ArcadeView: React.FC<ArcadeViewProps> = ({ onOpenDetails, onNavigateToLibrary }) => {
  const [subTab, setSubTab] = useState<ArcadeSubTab>('blur');
  const [animePool, setAnimePool] = useState<Anime[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState<boolean>(true);

  // Quotes Guesser State
  const [quoteIndex, setQuoteIndex] = useState<number>(0);
  const [quoteScore, setQuoteScore] = useState<number>(0);
  const [quoteAnswered, setQuoteAnswered] = useState<boolean>(false);
  const [selectedQuoteOption, setSelectedQuoteOption] = useState<number | null>(null);
  const [quoteStreak, setQuoteStreak] = useState<number>(0);

  // Load rich anime pool on mount for games
  useEffect(() => {
    let isMounted = true;
    const loadGamePool = async () => {
      setIsLoadingPool(true);
      try {
        const trending = await fetchTrendingAnime(1, 40);
        if (isMounted && trending.length > 0) {
          setAnimePool(trending);
        }
      } catch (err) {
        console.error('Failed to load anime pool for arcade:', err);
      } finally {
        if (isMounted) setIsLoadingPool(false);
      }
    };

    loadGamePool();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quotes handlers
  const currentQuote = FAMOUS_QUOTES[quoteIndex];

  const handleSelectQuoteOption = (idx: number) => {
    if (quoteAnswered) return;
    setSelectedQuoteOption(idx);
    setQuoteAnswered(true);

    const isCorrect = idx === currentQuote.correctIndex;
    if (isCorrect) {
      soundEffects.playQuizCorrect();
      setQuoteScore(prev => prev + 1);
      const nextStreak = quoteStreak + 1;
      setQuoteStreak(nextStreak);
      if (nextStreak % 3 === 0) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
      }
    } else {
      soundEffects.playQuizWrong();
      setQuoteStreak(0);
    }
  };

  const handleNextQuote = () => {
    soundEffects.playClick();
    setSelectedQuoteOption(null);
    setQuoteAnswered(false);
    setQuoteIndex(prev => (prev + 1) % FAMOUS_QUOTES.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-slate-900/95 via-purple-950/40 to-slate-900/95 border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-bold">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Otaku Arcade & Game Zone</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Anime Mini-Games, Character Gacha & Tier Lists
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Test your visual memory with Guess the Anime, battle ratings in Higher or Lower, unlock character cards from completed anime, rank tiers, and guess legendary quotes!
            </p>
          </div>

          {/* Sub Tab Switcher Navigation */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 shrink-0 self-start md:self-center overflow-x-auto max-w-full scrollbar-none">
            {/* Tab 1: Guess the Anime (Blur) */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setSubTab('blur');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                subTab === 'blur'
                  ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Guess Anime (Blur)</span>
            </button>

            {/* Tab 2: Higher or Lower */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setSubTab('higherlower');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                subTab === 'higherlower'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Higher or Lower</span>
            </button>

            {/* Tab 3: Character Gacha */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setSubTab('gacha');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                subTab === 'gacha'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dice5 className="w-3.5 h-3.5" />
              <span>Character Gacha</span>
            </button>

            {/* Tab 4: Tier Lists */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setSubTab('tierlist');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                subTab === 'tierlist'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Tier Lists</span>
            </button>

            {/* Tab 5: Quote Guesser */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setSubTab('quotes');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                subTab === 'quotes'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Quote className="w-3.5 h-3.5" />
              <span>Quote Guesser</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== SUBTAB 1: GUESS THE ANIME (BLUR MCQ) ===================== */}
      {subTab === 'blur' && (
        <BlurGuesser animePool={animePool} onOpenDetails={onOpenDetails} />
      )}

      {/* ===================== SUBTAB 2: HIGHER OR LOWER (RATING BATTLE) ===================== */}
      {subTab === 'higherlower' && (
        <HigherLowerGame animePool={animePool} onOpenDetails={onOpenDetails} />
      )}

      {/* ===================== SUBTAB 3: CHARACTER GACHA (COMPLETED ANIME SPINS) ===================== */}
      {subTab === 'gacha' && (
        <CharacterGacha
          onOpenDetails={onOpenDetails}
          onNavigateToLibrary={onNavigateToLibrary}
        />
      )}

      {/* ===================== SUBTAB 4: TIER LIST MAKER ===================== */}
      {subTab === 'tierlist' && <TierListMaker onOpenDetails={onOpenDetails} />}

      {/* ===================== SUBTAB 5: QUOTE GUESSER ===================== */}
      {subTab === 'quotes' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                <Quote className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Iconic Quote Guesser</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Question {quoteIndex + 1} of {FAMOUS_QUOTES.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Can you guess which legendary character spoke these words?
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400">Streak:</span>
                <span className="font-extrabold text-amber-300">{quoteStreak}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300">Score:</span>
                <span className="font-extrabold text-emerald-300">{quoteScore}</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-6">
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/10 text-center space-y-2">
              <p className="text-lg sm:text-xl font-serif italic text-white leading-relaxed">
                "{currentQuote.quote}"
              </p>
              <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                — from {currentQuote.anime}
              </p>
            </div>

            {/* 4 Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQuote.options.map((option, idx) => {
                const isSelected = selectedQuoteOption === idx;
                const isCorrect = idx === currentQuote.correctIndex;
                let btnStyle =
                  'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800 hover:border-slate-700';

                if (quoteAnswered) {
                  if (isCorrect) {
                    btnStyle =
                      'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-bold';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-bold';
                  } else {
                    btnStyle = 'bg-slate-950 border-slate-900 text-slate-500 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={quoteAnswered}
                    onClick={() => handleSelectQuoteOption(idx)}
                    className={`p-4 rounded-xl border text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {quoteAnswered && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {quoteAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Context Explanation */}
            {quoteAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1"
              >
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scene Lore:</span>
                </div>
                <p>{currentQuote.context}</p>
              </motion.div>
            )}

            {/* Next Button */}
            {quoteAnswered && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuote}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-600/30"
                >
                  <span>Next Quote</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
