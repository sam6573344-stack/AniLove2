import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Info, Plus, Minus, Check, Clock, Star, Bookmark, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Anime, UserMediaListItem, MediaListStatus } from '../types';

interface AnimeCardProps {
  anime: Anime;
  userItem?: UserMediaListItem;
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
  onUpdateStatus: (anime: Anime, status: MediaListStatus) => void;
  onUpdateProgress: (anime: Anime, newProgress: number) => void;
  onSelectGenre?: (genre: string) => void;
  onSelectStudio?: (studio: string) => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({
  anime,
  userItem,
  onOpenDetails,
  onPlayStream,
  onUpdateStatus,
  onUpdateProgress,
  onSelectGenre,
  onSelectStudio,
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isLongPressTriggeredRef = useRef(false);

  // Global coordination: Ensure ONLY ONE preview card is active/lifted at a time across the entire application
  useEffect(() => {
    const handleOtherCardPreview = (e: Event) => {
      const customEvent = e as CustomEvent<{ cardId: number }>;
      if (customEvent.detail && customEvent.detail.cardId !== anime.id) {
        setIsHeld(false);
        setShowStatusMenu(false);
      }
    };

    const handleOutsideInteraction = (e: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setIsHeld(false);
        setShowStatusMenu(false);
      }
    };

    window.addEventListener('anilove:active_preview_card', handleOtherCardPreview);
    document.addEventListener('touchstart', handleOutsideInteraction, { passive: true });
    document.addEventListener('mousedown', handleOutsideInteraction);

    return () => {
      window.removeEventListener('anilove:active_preview_card', handleOtherCardPreview);
      document.removeEventListener('touchstart', handleOutsideInteraction);
      document.removeEventListener('mousedown', handleOutsideInteraction);
    };
  }, [anime.id]);

  const title = anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Unknown Title';
  const coverUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium || '';
  const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;
  const episodesTotal = anime.episodes || '?';
  const currentProgress = userItem?.progress ?? 0;
  const currentStatus = userItem?.status;

  // Clean description string for the hover & hold preview snippet
  const synopsisSnippet = useMemo(() => {
    if (!anime.description) return 'No synopsis available for this title.';
    const clean = anime.description.replace(/<[^>]*>?/gm, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'");
    return clean.length > 130 ? `${clean.slice(0, 130)}...` : clean;
  }, [anime.description]);

  const studioName = anime.studios?.nodes?.[0]?.name;

  // Touch and hold detection for mobile / touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    // Notify all other cards to immediately close their lifted previews
    window.dispatchEvent(new CustomEvent('anilove:active_preview_card', { detail: { cardId: anime.id } }));

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    isLongPressTriggeredRef.current = false;

    // Start 300ms hold timer
    touchTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsHeld(true);
      window.dispatchEvent(new CustomEvent('anilove:active_preview_card', { detail: { cardId: anime.id } }));
      // Gentle haptic feedback if supported
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(35);
        }
      } catch (_) {}
    }, 320);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchTimerRef.current) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel if finger moved more than 8px (scrolling)
    if (diffX > 8 || diffY > 8) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchCancel = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If long-press just triggered, prevent default immediate click to allow interacting with the revealed preview
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    onOpenDetails(anime);
  };

  const handleStepProgress = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    const max = typeof anime.episodes === 'number' ? anime.episodes : 9999;
    const nextVal = Math.max(0, Math.min(max, currentProgress + delta));
    
    if (nextVal !== currentProgress) {
      if (typeof anime.episodes === 'number' && nextVal === anime.episodes) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      }
      onUpdateProgress(anime, nextVal);
    }
  };

  const handleStatusSelect = (e: React.MouseEvent, status: MediaListStatus) => {
    e.stopPropagation();
    setShowStatusMenu(false);
    onUpdateStatus(anime, status);
  };

  const handleToggleStatusMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !showStatusMenu;
    if (nextState) {
      window.dispatchEvent(new CustomEvent('anilove:active_preview_card', { detail: { cardId: anime.id } }));
    }
    setShowStatusMenu(nextState);
  };

  // Status color pill
  const getStatusBadge = () => {
    if (!currentStatus) return null;
    switch (currentStatus) {
      case 'CURRENT':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600/90 text-white shadow-sm">WATCHING</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600/90 text-white shadow-sm">COMPLETED</span>;
      case 'PLANNING':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600/90 text-white shadow-sm">PLANNING</span>;
      case 'PAUSED':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-600/90 text-white shadow-sm">PAUSED</span>;
      case 'DROPPED':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600/90 text-white shadow-sm">DROPPED</span>;
      default:
        return null;
    }
  };

  return (
    <div
      ref={cardRef}
      id={`anime-card-${anime.id}`}
      className={`group relative flex flex-col transition-all duration-300 ease-out select-none cursor-pointer will-change-transform ${
        isHeld ? '-translate-y-2 scale-[1.02] z-30' : 'hover:-translate-y-2 hover:scale-[1.02] z-10 hover:z-30'
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => {
        window.dispatchEvent(new CustomEvent('anilove:active_preview_card', { detail: { cardId: anime.id } }));
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-white/5 border border-white/10 shadow-lg group-hover:shadow-xl group-hover:border-white/20 transition-all duration-300 backdrop-blur-md">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition-transform duration-500 ${
              isHeld ? 'scale-105' : 'group-hover:scale-105'
            }`}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-white/5 text-slate-400 font-bold text-sm p-4 text-center">
            {title}
          </div>
        )}

        {/* Ambient Top Shadow Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-black/30 opacity-60 group-hover:opacity-30 transition-opacity" />

        {/* Top-Left Score Badge */}
        {score && (
          <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold border border-white/15 shadow-md pointer-events-none">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{score}</span>
          </div>
        )}

        {/* Live Mouse-Hover & Touch-Hold Preview Overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-[#0f172a]/95 via-[#0f172a]/85 to-black/50 backdrop-blur-sm transition-all duration-200 flex flex-col justify-between p-3 z-20 ${
            isHeld
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
          }`}
        >
          {/* Top spacer to preserve score badge */}
          <div className="flex items-center justify-between">
            <div className="w-12" />
            <div className="flex items-center gap-1">
              {/* Bookmark status button */}
              <button
                title="Bookmark / Change Status"
                onClick={handleToggleStatusMenu}
                className={`p-1.5 rounded-lg transition backdrop-blur-md ${
                  currentStatus
                    ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-md shadow-pink-500/40'
                    : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 border border-white/15'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center Details & Synopsis */}
          <div className="space-y-2 my-auto text-left">
            {/* Details Pill Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onOpenDetails(anime);
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-pink-500/30 active:scale-95 transition cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Details</span>
              </button>
            </div>

            {/* Uppercase Genres */}
            {anime.genres && anime.genres.length > 0 && (
              <div className="text-[10px] font-black uppercase tracking-wider text-pink-400 text-center truncate">
                {anime.genres.slice(0, 2).join(' • ')}
              </div>
            )}

            {/* Synopsis Preview Snippet */}
            <p className="text-[11px] text-slate-200 line-clamp-3 leading-relaxed font-medium text-left">
              {synopsisSnippet}
            </p>
          </div>

          {/* Bottom Episode Stats & Watch Action */}
          <div className="space-y-1.5 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>{typeof anime.episodes === 'number' ? `${anime.episodes} eps` : 'Ongoing'}</span>
              <span>•</span>
              <span className="capitalize">{anime.status ? anime.status.toLowerCase().replace('_', ' ') : 'releasing'}</span>
            </div>

            <button
              onClick={e => {
                e.stopPropagation();
                setIsHeld(false);
                onPlayStream(anime);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/15 backdrop-blur-md shadow-md transition active:scale-95 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-white" />
              <span>Watch Now</span>
            </button>
          </div>
        </div>

        {/* Quick Status Dropdown Menu on Card */}
        {showStatusMenu && (
          <div
            className="absolute top-10 right-2.5 z-40 w-36 rounded-2xl bg-[#0f172a]/95 border border-white/15 shadow-2xl p-1.5 text-xs text-slate-200 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {(['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED'] as MediaListStatus[]).map(st => {
              const active = currentStatus === st;
              const labels: Record<MediaListStatus, string> = {
                CURRENT: 'Watching',
                PLANNING: 'Planning',
                COMPLETED: 'Completed',
                PAUSED: 'Paused',
                DROPPED: 'Dropped',
                REPEATING: 'Rewatching',
              };
              return (
                <button
                  key={st}
                  onClick={e => handleStatusSelect(e, st)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition cursor-pointer ${
                    active ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <span>{labels[st]}</span>
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content Bottom Title & Metadata */}
      <div className="pt-2.5 px-0.5 space-y-0.5 text-left">
        {/* Title */}
        <h4
          className="font-bold text-xs sm:text-sm text-slate-100 line-clamp-1 leading-snug group-hover:text-pink-400 transition"
          title={title}
        >
          {title}
        </h4>

        {/* Format and Year */}
        <div className="text-[11px] sm:text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <span>{anime.format?.replace('_', ' ') || 'TV'}</span>
          <span>·</span>
          <span>{anime.seasonYear || anime.startDate?.year || '2026'}</span>
        </div>
      </div>
    </div>
  );
};
