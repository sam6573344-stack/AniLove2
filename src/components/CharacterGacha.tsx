import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Dice5,
  Layers,
  Search,
  BookOpen,
  CheckCircle2,
  Tv,
  X,
  Volume2,
  Quote,
  Flame,
  Award,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { GachaCard, UserMediaListItem, Anime } from '../types';
import {
  getStoredLibrary,
  getStoredGachaVault,
  saveStoredGachaCards,
  getStoredGachaSpinsUsed,
  incrementGachaSpinsUsed,
} from '../services/storage';
import { soundEffects } from '../services/soundEffects';
import {
  ICONIC_CHARACTERS_POOL,
  fetchCharactersForAnime,
  createCharacterCardFromProfile,
  AnimeCharacterProfile,
} from '../services/characterPool';

interface CharacterGachaProps {
  onOpenDetails?: (anime: Anime) => void;
  onNavigateToLibrary?: () => void;
}

const STARTER_FREE_SPINS = 3;

export const CharacterGacha: React.FC<CharacterGachaProps> = ({
  onOpenDetails,
  onNavigateToLibrary,
}) => {
  const [library, setLibrary] = useState<UserMediaListItem[]>(() => getStoredLibrary());
  const [vaultCards, setVaultCards] = useState<GachaCard[]>(() => getStoredGachaVault());
  const [spinsUsed, setSpinsUsed] = useState<number>(() => getStoredGachaSpinsUsed());
  const [isSummoning, setIsSummoning] = useState<boolean>(false);
  const [lastPulledCard, setLastPulledCard] = useState<GachaCard | null>(null);
  const [selectedVaultCard, setSelectedVaultCard] = useState<GachaCard | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [selectedAnimeFilter, setSelectedAnimeFilter] = useState<string>('ALL');

  // Refresh library & spins on mount or focus
  useEffect(() => {
    const handleStorageUpdate = () => {
      setLibrary(getStoredLibrary());
      setVaultCards(getStoredGachaVault());
      setSpinsUsed(getStoredGachaSpinsUsed());
    };

    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  // Completed anime from user library
  const completedAnimeList = useMemo(() => {
    return library.filter(item => item.status === 'COMPLETED');
  }, [library]);

  const completedCount = completedAnimeList.length;
  const totalEarnedSpins = completedCount + STARTER_FREE_SPINS;
  const availableSpins = Math.max(0, totalEarnedSpins - spinsUsed);

  // Extract unique anime titles in collection for filtering
  const collectionAnimeTitles = useMemo(() => {
    const set = new Set<string>();
    vaultCards.forEach(c => {
      if (c.animeTitle) set.add(c.animeTitle);
    });
    return Array.from(set);
  }, [vaultCards]);

  // Filtered vault cards
  const filteredCards = useMemo(() => {
    return vaultCards.filter(card => {
      const matchesSearch =
        !searchFilter.trim() ||
        card.characterName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        card.animeTitle.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesAnime =
        selectedAnimeFilter === 'ALL' || card.animeTitle === selectedAnimeFilter;

      return matchesSearch && matchesAnime;
    });
  }, [vaultCards, searchFilter, selectedAnimeFilter]);

  // Execute Summon Action
  const handleSummon = async () => {
    if (availableSpins <= 0 || isSummoning) return;

    setIsSummoning(true);
    soundEffects.playGachaRoll();

    try {
      let candidateProfile: AnimeCharacterProfile | null = null;

      // 1. If user has completed anime, pick one of their completed anime
      if (completedAnimeList.length > 0) {
        const randCompleted =
          completedAnimeList[Math.floor(Math.random() * completedAnimeList.length)];
        const animeId = randCompleted.mediaId;
        const animeTitle =
          randCompleted.media?.title?.english ||
          randCompleted.media?.title?.userPreferred ||
          randCompleted.media?.title?.romaji ||
          'Anime';

        // Check if we have pre-indexed characters for this anime
        const matchingLocal = ICONIC_CHARACTERS_POOL.filter(
          c =>
            c.animeId === animeId ||
            c.animeTitle.toLowerCase() === animeTitle.toLowerCase()
        );

        if (matchingLocal.length > 0) {
          candidateProfile = matchingLocal[Math.floor(Math.random() * matchingLocal.length)];
        } else {
          // Fetch characters via live GraphQL
          const onlineChars = await fetchCharactersForAnime(animeId);
          if (onlineChars.length > 0) {
            candidateProfile = onlineChars[Math.floor(Math.random() * onlineChars.length)];
          }
        }
      }

      // 2. Fallback to iconic pool if no candidate found
      if (!candidateProfile) {
        candidateProfile =
          ICONIC_CHARACTERS_POOL[Math.floor(Math.random() * ICONIC_CHARACTERS_POOL.length)];
      }

      // Create new character card
      const newCard = createCharacterCardFromProfile(candidateProfile);

      // Decrement spin & save
      incrementGachaSpinsUsed(1);
      setSpinsUsed(prev => prev + 1);

      const updatedVault = [newCard, ...vaultCards];
      setVaultCards(updatedVault);
      saveStoredGachaCards(updatedVault);

      setTimeout(() => {
        setLastPulledCard(newCard);
        setIsSummoning(false);
        soundEffects.playSuccess();
        confetti({
          particleCount: 80,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981'],
        });
      }, 1000);
    } catch (err) {
      console.error('Error during character summon:', err);
      setIsSummoning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Summon Machine Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-950/60 via-slate-900 to-slate-950 border border-white/10 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-80 h-80 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-extrabold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Character Card Summoner</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Unlock Characters from your Completed Anime
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every anime you finish in your library awards{' '}
              <strong className="text-purple-300 font-bold">+1 Summon Spin</strong>! Collect beloved anime heroes, protagonists, and sidekicks into your personal character binder.
            </p>

            {/* Starter bonus hint */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-amber-300 font-medium">
              <span>🎁 Includes {STARTER_FREE_SPINS} Starter Bonus Spins!</span>
            </div>
          </div>

          {/* Ticket Counter & Summon Button */}
          <div className="flex flex-col items-center gap-4 bg-slate-950/80 p-6 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl w-full sm:w-auto min-w-[280px]">
            <div className="text-center space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Available Summon Spins
              </span>
              <div className="flex items-center justify-center gap-2">
                <Dice5 className="w-7 h-7 text-purple-400" />
                <span className="text-4xl font-black text-white tracking-tight">
                  {availableSpins}
                </span>
                <span className="text-xs font-bold text-slate-400 self-end pb-1">
                  / {totalEarnedSpins}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Completed in Library: <strong className="text-emerald-400">{completedCount}</strong> anime
              </p>
            </div>

            {/* Summon Button */}
            <button
              disabled={availableSpins <= 0 || isSummoning}
              onClick={handleSummon}
              className={`w-full py-3.5 px-6 rounded-2xl font-black text-sm transition flex items-center justify-center gap-2.5 shadow-xl cursor-pointer ${
                availableSpins > 0 && !isSummoning
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-purple-600/30 hover:scale-105 active:scale-95'
                  : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSummoning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
                  <span>Summoning Character...</span>
                </>
              ) : availableSpins > 0 ? (
                <>
                  <Sparkles className="w-4 h-4 text-pink-300" />
                  <span>Summon Character (1 Spin)</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>No Spins Left</span>
                </>
              )}
            </button>

            {availableSpins <= 0 && (
              <p className="text-[11px] text-center text-slate-400 max-w-[240px]">
                Finish watching more anime in your Library to earn new character summon spins!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RECENT PULL REVEAL MODAL */}
      <AnimatePresence>
        {lastPulledCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-purple-500/40 p-6 shadow-2xl text-center space-y-4 text-slate-100 overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-purple-500/25 rounded-full blur-2xl pointer-events-none" />

              <button
                onClick={() => setLastPulledCard(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 hover:text-white transition cursor-pointer z-20"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 pt-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-purple-400">
                  New Character Unlocked!
                </span>
                <h3 className="text-xl font-black text-white leading-tight">
                  {lastPulledCard.characterName}
                </h3>
                {lastPulledCard.characterNativeName && (
                  <p className="text-xs text-slate-400 font-medium">
                    {lastPulledCard.characterNativeName}
                  </p>
                )}
              </div>

              {/* Character Portrait */}
              <div className="relative w-44 h-56 mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-xl bg-slate-950">
                <img
                  src={lastPulledCard.characterImage || lastPulledCard.imageUrl}
                  alt={lastPulledCard.characterName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-2 left-2 right-2 text-center">
                  <span className="text-[10px] font-bold text-pink-300 px-2 py-0.5 rounded-full bg-slate-950/80 border border-pink-500/30">
                    {lastPulledCard.characterRole || 'Character'}
                  </span>
                </div>
              </div>

              {/* Anime Origin */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-white/10 text-xs space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  From Series:
                </span>
                <span className="font-extrabold text-purple-300 block truncate">
                  {lastPulledCard.animeTitle}
                </span>
                {lastPulledCard.voiceActor && (
                  <span className="text-[11px] text-slate-400 block">
                    VA: {lastPulledCard.voiceActor}
                  </span>
                )}
              </div>

              {lastPulledCard.quote && (
                <p className="text-xs italic text-slate-300 line-clamp-2 px-2">
                  "{lastPulledCard.quote}"
                </p>
              )}

              <button
                onClick={() => setLastPulledCard(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-lg cursor-pointer transition"
              >
                Add to Character Binder
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CHARACTER BINDER / COLLECTION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Character Binder</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {vaultCards.length} Collected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Browse every character card you have unlocked
              </p>
            </div>
          </div>

          {/* Search & Anime Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Anime Filter Dropdown */}
            {collectionAnimeTitles.length > 0 && (
              <select
                value={selectedAnimeFilter}
                onChange={e => setSelectedAnimeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white focus:outline-none focus:border-purple-500/60 cursor-pointer"
              >
                <option value="ALL">All Series ({collectionAnimeTitles.length})</option>
                {collectionAnimeTitles.map(title => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search character..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500/60"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Character Card Grid */}
        {filteredCards.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredCards.map((card, idx) => (
              <motion.div
                key={card.id || idx}
                whileHover={{ scale: 1.03, y: -3 }}
                onClick={() => setSelectedVaultCard(card)}
                className="group relative rounded-2xl overflow-hidden bg-slate-900/80 border border-white/10 hover:border-purple-500/50 p-2.5 shadow-lg transition-all cursor-pointer flex flex-col"
              >
                {/* Character Portrait Image */}
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={card.characterImage || card.imageUrl}
                    alt={card.characterName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

                  {/* Role Pill */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-[9px] font-extrabold text-pink-300 px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-white/10 block truncate text-center">
                      {card.characterRole || 'Character'}
                    </span>
                  </div>
                </div>

                {/* Character Meta */}
                <div className="pt-2.5 space-y-0.5 min-w-0">
                  <h4 className="text-xs font-black text-white truncate leading-tight group-hover:text-purple-300 transition">
                    {card.characterName}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {card.animeTitle}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-white/10 space-y-3">
            <Dice5 className="w-10 h-10 text-purple-400 mx-auto opacity-60" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">No Character Cards Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchFilter || selectedAnimeFilter !== 'ALL'
                  ? 'Try changing your search keywords or series filter.'
                  : 'Hit the Summon button above using your completed anime spins to unlock character cards!'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CHARACTER DETAIL MODAL */}
      <AnimatePresence>
        {selectedVaultCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <button
                onClick={() => setSelectedVaultCard(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <img
                  src={selectedVaultCard.characterImage || selectedVaultCard.imageUrl}
                  alt={selectedVaultCard.characterName}
                  className="w-24 h-32 object-cover rounded-2xl border border-white/20 shadow-md shrink-0"
                />
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                    {selectedVaultCard.characterRole || 'Character Profile'}
                  </span>
                  <h3 className="text-lg font-black text-white leading-tight">
                    {selectedVaultCard.characterName}
                  </h3>
                  {selectedVaultCard.characterNativeName && (
                    <p className="text-xs text-slate-400">
                      {selectedVaultCard.characterNativeName}
                    </p>
                  )}
                  <p className="text-xs text-purple-300 font-medium truncate pt-1">
                    From: {selectedVaultCard.animeTitle}
                  </p>
                  {selectedVaultCard.voiceActor && (
                    <p className="text-[11px] text-slate-400">
                      CV: {selectedVaultCard.voiceActor}
                    </p>
                  )}
                </div>
              </div>

              {selectedVaultCard.quote && (
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                  <Quote className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <p className="italic">"{selectedVaultCard.quote}"</p>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                <span>
                  Obtained:{' '}
                  {selectedVaultCard.obtainedAt
                    ? new Date(selectedVaultCard.obtainedAt).toLocaleDateString()
                    : 'Collection'}
                </span>
                <button
                  onClick={() => setSelectedVaultCard(null)}
                  className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
