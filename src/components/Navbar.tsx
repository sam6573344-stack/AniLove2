import React, { useState, useEffect } from 'react';
import { Home, Search, Gamepad2, Calendar, Bookmark, User, Settings, RefreshCw, Heart, Bot, Compass, Dices, Sparkles } from 'lucide-react';
import { UserSettings, AppNotification, Anime } from '../types';
import { NotificationCenter } from './NotificationCenter';
import { DynamicLogo } from './DynamicLogo';
import { soundEffects } from '../services/soundEffects';

export type TabType = 'home' | 'discover' | 'arcade' | 'schedule' | 'library' | 'account';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  settings: UserSettings;
  libraryCount: number;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
  onOpenAiSensei: () => void;
  onOpenGacha?: () => void;
  isPlaying?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  settings,
  libraryCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onOpenDetails,
  onPlayStream,
  onOpenAiSensei,
  onOpenGacha,
  isPlaying = false,
}) => {
  const isTwoWayConnected = Boolean(settings.twoWaySyncEnabled && settings.anilistToken);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleTabClick = (tab: TabType) => {
    soundEffects.playClick();
    onSelectTab(tab);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-slate-950/85 backdrop-blur-md border-b border-white/10 shadow-lg shadow-black/40'
          : 'bg-gradient-to-b from-black/80 via-black/35 to-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Dynamic Brand Logo */}
        <DynamicLogo
          isTwoWayConnected={isTwoWayConnected}
          isPlaying={isPlaying}
          libraryCount={libraryCount}
          onClick={() => onSelectTab('home')}
        />

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10">
          <button
            id="nav-tab-home"
            onClick={() => handleTabClick('home')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'home'
                ? 'bg-white/20 text-white border border-white/25 shadow-md backdrop-blur-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Home className="w-4 h-4 opacity-80" />
            <span>Home</span>
          </button>

          <button
            id="nav-tab-discover"
            onClick={() => handleTabClick('discover')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'discover'
                ? 'bg-white/20 text-white border border-white/25 shadow-md backdrop-blur-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Search className="w-4 h-4 opacity-80" />
            <span>Search</span>
          </button>

          {/* Arcade Tab (Game Console Icon) with Quiz & Facts */}
          <button
            id="nav-tab-arcade"
            onClick={() => handleTabClick('arcade')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'arcade'
                ? 'bg-gradient-to-r from-pink-500/40 to-violet-500/40 text-white border border-pink-500/50 shadow-md shadow-pink-500/20 backdrop-blur-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-pink-400" />
            <span>Arcade</span>
          </button>

          <button
            id="nav-tab-schedule"
            onClick={() => handleTabClick('schedule')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'schedule'
                ? 'bg-white/20 text-white border border-white/25 shadow-md backdrop-blur-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4 opacity-80" />
            <span>Schedule</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => handleTabClick('library')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'library'
                ? 'bg-white/20 text-white border border-white/25 shadow-md backdrop-blur-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bookmark className="w-4 h-4 opacity-80" />
            <span>Library</span>
            {libraryCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500/40 text-pink-300 text-[10px] font-bold border border-pink-500/50">
                {libraryCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-account"
            onClick={() => handleTabClick('account')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              currentTab === 'account'
                ? 'bg-white/20 text-white border border-white/25 shadow-md backdrop-blur-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4 opacity-80" />
            <span>Account</span>
            {isTwoWayConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            )}
          </button>
        </nav>

        {/* Right Section: Gacha + AI Sensei + Cloud Sync + Notifications */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Anime Gacha Button */}
          {onOpenGacha && (
            <button
              id="nav-gacha-btn"
              onClick={onOpenGacha}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/25 hover:bg-white/15 text-amber-300 text-xs font-bold border border-white/10 backdrop-blur-md shadow-sm transition active:scale-95 cursor-pointer"
              title="Spin Anime Gacha / Randomizer"
            >
              <Dices className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Gacha</span>
            </button>
          )}

          {/* AniAI Sensei Trigger Button */}
          <button
            id="nav-ai-sensei-btn"
            onClick={onOpenAiSensei}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white text-xs font-bold shadow-lg shadow-pink-500/25 border border-pink-400/30 transition active:scale-95 cursor-pointer"
            title="Ask AniAI Sensei for recommendations and lore"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AniAI</span>
          </button>

          {/* Cloud Sync State Chip */}
          <div
            onClick={() => onSelectTab('account')}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/25 border border-white/10 hover:border-white/20 backdrop-blur-md cursor-pointer text-xs transition"
            title={
              isTwoWayConnected
                ? `AniList 2-Way Sync Active (${settings.anilistUser?.name || 'Connected'})`
                : 'AniList Account Not Linked'
            }
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isTwoWayConnected ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <span
              className={`font-semibold ${
                isTwoWayConnected ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {isTwoWayConnected ? 'Synced' : 'Offline'}
            </span>
          </div>

          {/* Real-time Notification Center Bell */}
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onClearAll={onClearAll}
            onOpenDetails={onOpenDetails}
            onPlayStream={onPlayStream}
            onNavigateToSettings={() => onSelectTab('settings')}
          />
        </div>
      </div>
    </header>
  );
};

