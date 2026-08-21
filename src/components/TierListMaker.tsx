import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Plus,
  Trash2,
  Share2,
  Download,
  RotateCcw,
  Sparkles,
  Search,
  Check,
  ChevronDown,
  Layers,
  Flame,
  Star,
  Tv,
} from 'lucide-react';
import { Anime, UserMediaListItem, TierRank, TierListEntry } from '../types';
import { searchAnimeAdvanced } from '../services/anilist';
import { getStoredTierLists, saveStoredTierLists } from '../services/storage';
import { soundEffects } from '../services/soundEffects';

interface TierListMakerProps {
  userLibrary?: UserMediaListItem[];
  onOpenDetails: (anime: Anime) => void;
}

const TIERS: { rank: TierRank; label: string; bg: string; border: string; text: string; headerBg: string }[] = [
  { rank: 'S', label: 'S - God Tier / Masterpiece', bg: 'bg-rose-950/20', border: 'border-rose-500/40', text: 'text-rose-400', headerBg: 'bg-gradient-to-r from-rose-600 to-pink-600' },
  { rank: 'A', label: 'A - Exceptional & Peak', bg: 'bg-amber-950/20', border: 'border-amber-500/40', text: 'text-amber-400', headerBg: 'bg-gradient-to-r from-amber-500 to-orange-600' },
  { rank: 'B', label: 'B - Great & Entertaining', bg: 'bg-emerald-950/20', border: 'border-emerald-500/40', text: 'text-emerald-400', headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-600' },
  { rank: 'C', label: 'C - Decent / Average', bg: 'bg-cyan-950/20', border: 'border-cyan-500/40', text: 'text-cyan-400', headerBg: 'bg-gradient-to-r from-cyan-600 to-blue-600' },
  { rank: 'D', label: 'D - Mid / Dropped', bg: 'bg-purple-950/20', border: 'border-purple-500/40', text: 'text-purple-400', headerBg: 'bg-gradient-to-r from-purple-600 to-slate-700' },
];

export const TierListMaker: React.FC<TierListMakerProps> = ({
  userLibrary = [],
  onOpenDetails,
}) => {
  const [entries, setEntries] = useState<TierListEntry[]>(() => {
    const saved = getStoredTierLists();
    return saved.length > 0 ? saved : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedRankForAdd, setSelectedRankForAdd] = useState<TierRank>('S');

  // Save changes
  useEffect(() => {
    saveStoredTierLists(entries);
  }, [entries]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchAnimeAdvanced({ search: searchQuery.trim(), perPage: 8 });
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching for tier list:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddAnime = (anime: Anime, rank: TierRank = 'S') => {
    if (entries.some(e => e.animeId === anime.id)) {
      // Move to target tier
      setEntries(prev => prev.map(e => e.animeId === anime.id ? { ...e, rank } : e));
    } else {
      const newEntry: TierListEntry = {
        animeId: anime.id,
        anime,
        rank,
        order: entries.filter(e => e.rank === rank).length,
      };
      setEntries(prev => [...prev, newEntry]);
    }

    if (rank === 'S') {
      soundEffects.playLegendaryReveal();
    } else {
      soundEffects.playCardSelect();
    }
  };

  const handleMoveTier = (animeId: number, targetRank: TierRank) => {
    soundEffects.playCardSelect();
    setEntries(prev => prev.map(e => e.animeId === animeId ? { ...e, rank: targetRank } : e));
  };

  const handleRemoveEntry = (animeId: number) => {
    soundEffects.playClick();
    setEntries(prev => prev.filter(e => e.animeId !== animeId));
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to reset the tier list?')) {
      setEntries([]);
      soundEffects.playClick();
    }
  };

  const handleShareSummary = () => {
    soundEffects.playSuccess();
    const lines = ['🏆 **My Anime Tier List (AniLove)** 🏆\n'];
    TIERS.forEach(t => {
      const itemsInTier = entries.filter(e => e.rank === t.rank);
      if (itemsInTier.length > 0) {
        const names = itemsInTier.map(e => e.anime.title.english || e.anime.title.romaji).join(', ');
        lines.push(`**[${t.rank} Tier]**: ${names}`);
      }
    });
    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white">Anime Tier List Ranking</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rank and categorize your favorite anime across S, A, B, C, and D tiers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleShareSummary}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-indigo-600/30"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedShare ? 'Copied Summary!' : 'Export & Share'}</span>
          </button>

          <button
            onClick={handleClearAll}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition border border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Quick Add Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search anime to rank (e.g. Frieren, Solo Leveling, Attack on Titan)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Add to:</span>
            <select
              value={selectedRankForAdd}
              onChange={e => setSelectedRankForAdd(e.target.value as TierRank)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="S">S Tier</option>
              <option value="A">A Tier</option>
              <option value="B">B Tier</option>
              <option value="C">C Tier</option>
              <option value="D">D Tier</option>
            </select>
          </div>
        </div>

        {/* Live Search Suggestions Dropdown */}
        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-2 border-t border-slate-800">
            {searchResults.map(anime => {
              const title = anime.title.english || anime.title.romaji || 'Anime';
              const isAlreadyAdded = entries.some(e => e.animeId === anime.id);
              return (
                <div
                  key={anime.id}
                  onClick={() => handleAddAnime(anime, selectedRankForAdd)}
                  className="group relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-indigo-500 transition cursor-pointer p-1 text-left"
                >
                  <img
                    src={anime.coverImage.medium}
                    alt={title}
                    className="w-full h-24 object-cover rounded-lg group-hover:scale-105 transition"
                  />
                  <div className="p-1">
                    <p className="text-[10px] font-bold text-slate-200 line-clamp-1">{title}</p>
                    <span className="text-[9px] text-indigo-400 font-bold flex items-center gap-0.5 mt-0.5">
                      <Plus className="w-2.5 h-2.5" />
                      Add to {selectedRankForAdd}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tier Board */}
      <div className="space-y-3">
        {TIERS.map(tier => {
          const itemsInTier = entries.filter(e => e.rank === tier.rank);
          return (
            <div
              key={tier.rank}
              className={`rounded-2xl overflow-hidden border ${tier.border} ${tier.bg} flex flex-col md:flex-row min-h-[110px] shadow-lg`}
            >
              {/* Tier Header Tag */}
              <div
                className={`w-full md:w-32 ${tier.headerBg} p-4 flex flex-row md:flex-col items-center justify-center text-white shrink-0 shadow-md`}
              >
                <span className="text-2xl sm:text-3xl font-black tracking-wider">{tier.rank}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90 text-center ml-2 md:ml-0 md:mt-1">
                  {tier.rank === 'S' ? 'God Tier' : tier.rank === 'A' ? 'Peak' : tier.rank === 'B' ? 'Great' : tier.rank === 'C' ? 'Decent' : 'Dropped'}
                </span>
                <span className="text-[10px] opacity-75 ml-auto md:ml-0 md:mt-1 font-mono">
                  ({itemsInTier.length})
                </span>
              </div>

              {/* Tier Content Grid */}
              <div className="flex-1 p-3 flex flex-wrap gap-3 items-center min-h-[90px] bg-slate-950/40">
                {itemsInTier.length === 0 ? (
                  <div className="w-full text-center py-4 text-xs text-slate-500 italic">
                    No anime in this tier. Search above or re-rank an existing title.
                  </div>
                ) : (
                  itemsInTier.map(entry => {
                    const title = entry.anime.title.english || entry.anime.title.romaji || 'Anime';
                    return (
                      <div
                        key={entry.animeId}
                        className="group relative w-24 sm:w-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/80 shadow-md hover:border-indigo-400 transition hover:scale-105"
                      >
                        <img
                          src={entry.anime.coverImage.large || entry.anime.coverImage.medium}
                          alt={title}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-1.5 bg-slate-950/90 text-center">
                          <p className="text-[10px] font-bold text-white line-clamp-1">{title}</p>
                        </div>

                        {/* Quick Hover Controls */}
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center p-1.5 gap-1">
                          <button
                            onClick={() => onOpenDetails(entry.anime)}
                            className="w-full py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center gap-1"
                          >
                            <Tv className="w-2.5 h-2.5" />
                            <span>Details</span>
                          </button>

                          {/* Move Rank Dropdown */}
                          <div className="grid grid-cols-5 gap-0.5 w-full">
                            {(['S', 'A', 'B', 'C', 'D'] as TierRank[]).map(r => (
                              <button
                                key={r}
                                onClick={() => handleMoveTier(entry.animeId, r)}
                                className={`py-0.5 text-[9px] font-black rounded ${
                                  entry.rank === r ? 'bg-amber-400 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => handleRemoveEntry(entry.animeId)}
                            className="w-full py-0.5 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center gap-1 mt-0.5"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
