import React, { useState, useEffect, useCallback } from 'react';
import { Anime, UserMediaListItem, UserSettings, MediaListStatus, AnimeTrailer, AppNotification } from './types';
import {
  fetchHomeFeed,
  fetchTrendingAnime,
  fetchPopularAnime,
  fetchTopRatedAnime,
  fetchNewestAnime,
  fetchUpcomingAnime,
  fetchTopMoviesAnime,
  fetchGenreAnime,
  fetchRomComAnime,
  parseOAuthTokenFromHash,
  fetchAuthenticatedViewer,
  saveMediaListEntry
} from './services/anilist';
import {
  getUserLibrary,
  saveUserLibrary,
  getUserSettings,
  saveUserSettings,
  updateLibraryItem,
  exportLibraryAsJSON,
  importLibraryFromJSON,
  getStoredNotifications,
  saveStoredNotifications,
  getStoredWatchHistory,
  saveStoredWatchHistory,
} from './services/storage';
import { auth, subscribeToCloudLibrary, subscribeToCloudWatchHistory, syncUserProfileToCloud } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { Navbar, TabType } from './components/Navbar';
import { HeroSpotlight } from './components/HeroSpotlight';
import { AnimeCard } from './components/AnimeCard';
import { HorizontalAnimeRow } from './components/HorizontalAnimeRow';
import { ContinueWatchingSection } from './components/ContinueWatchingSection';
import { SearchView } from './components/SearchView';
import { AnimeDetailModal } from './components/AnimeDetailModal';
import { TrailerModal } from './components/TrailerModal';
import { ScheduleView } from './components/ScheduleView';
import { MyLibraryView } from './components/MyLibraryView';
import { AccountView } from './components/AccountView';
import { WatchView } from './components/WatchView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ArcadeView } from './components/ArcadeView';
import { AnimeGachaModal } from './components/AnimeGachaModal';
import { AiAnimeSenseiModal } from './components/AiAnimeSenseiModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { soundEffects } from './services/soundEffects';
import { Sparkles, Keyboard } from 'lucide-react';

export function App() {
  // Navigation State: 'home' | 'discover' | 'seasonal' | 'schedule' | 'library' | 'settings'
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isGachaModalOpen, setIsGachaModalOpen] = useState(false);

  // Active Standalone Watch Page State
  const [activeWatchEpisode, setActiveWatchEpisode] = useState<{
    anime: Anime;
    episodeNumber: number;
    startTime?: number;
  } | null>(null);

  // Persistence State
  const [library, setLibrary] = useState<UserMediaListItem[]>(() => getUserLibrary());
  const [settings, setSettings] = useState<UserSettings>(() => getUserSettings());
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getStoredNotifications());

  // Home Catalog Data
  const [trendingAnime, setTrendingAnime] = useState<Anime[]>([]);
  const [popularAnime, setPopularAnime] = useState<Anime[]>([]);
  const [topRatedAnime, setTopRatedAnime] = useState<Anime[]>([]);
  const [newestAnime, setNewestAnime] = useState<Anime[]>([]);
  const [upcomingAnime, setUpcomingAnime] = useState<Anime[]>([]);
  const [moviesAnime, setMoviesAnime] = useState<Anime[]>([]);
  const [actionAnime, setActionAnime] = useState<Anime[]>([]);
  const [fantasyAnime, setFantasyAnime] = useState<Anime[]>([]);
  const [romComAnime, setRomComAnime] = useState<Anime[]>([]);
  const [isMainLoading, setIsMainLoading] = useState(true);

  // Selected Studio/Genre for Search Navigation
  const [selectedStudioForSearch, setSelectedStudioForSearch] = useState<string | null>(null);

  // Modals
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [streamInitialEpisode, setStreamInitialEpisode] = useState<number | undefined>(undefined);
  const [streamInitialTime, setStreamInitialTime] = useState<number | undefined>(undefined);
  const [startInWatchMode, setStartInWatchMode] = useState<boolean>(false);
  const [trailerData, setTrailerData] = useState<{ trailer: AnimeTrailer; title: string } | null>(null);
  
  // AI Sensei & Keyboard Shortcuts Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [aiContextAnime, setAiContextAnime] = useState<Anime | null>(null);

  // Notifications / Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Synchronize dynamic theme classes & sound settings
  useEffect(() => {
    const theme = settings.theme || 'midnight';
    const themeList = ['theme-midnight', 'theme-cyber', 'theme-sakura', 'theme-slate', 'theme-light', 'theme-ghibli', 'theme-amoled', 'theme-solar'];
    themeList.forEach(t => document.documentElement.classList.remove(t));
    document.documentElement.classList.add(`theme-${theme}`);

    soundEffects.setEnabled(settings.soundEffectsEnabled ?? true);
    soundEffects.setVolume(settings.soundVolume ?? 0.8);
  }, [settings.theme, settings.soundEffectsEnabled, settings.soundVolume]);

  // Persist notifications on change
  useEffect(() => {
    saveStoredNotifications(notifications);
  }, [notifications]);

  const showToast = useCallback((type: 'success' | 'error' | 'info' | 'sync', message: string, title?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Dispatch App Notification Helper
  const triggerNotification = useCallback((
    type: 'airing' | 'sync' | 'library' | 'system',
    title: string,
    message: string,
    anime?: Anime,
    episode?: number
  ) => {
    if (!settings.notificationsEnabled) return;
    if (type === 'airing' && !settings.notifyAiringEpisodes) return;
    if (type === 'sync' && !settings.notifySyncUpdates) return;

    const newNotification: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      anime,
      episode,
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 49)]);

    // Native Browser Push Notification
    if (settings.browserPushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: anime?.coverImage?.medium || '/favicon.ico',
        });
      } catch (err) {
        console.error('Error firing push notification:', err);
      }
    }
  }, [settings]);

  // 1. Check for AniList OAuth Implicit Token in URL Hash
  useEffect(() => {
    const token = parseOAuthTokenFromHash();
    if (token) {
      // Clear hash from URL cleanly
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      fetchAuthenticatedViewer(token)
        .then(user => {
          if (user) {
            const updated: UserSettings = {
              ...settings,
              anilistToken: token,
              anilistUser: user,
              twoWaySyncEnabled: true,
              lastSyncTimestamp: Date.now(),
            };
            setSettings(updated);
            saveUserSettings(updated);
            showToast(
              'sync',
              `Welcome ${user.name}! AniList Two-Way Cloud Sync is successfully activated.`,
              'AniList Connected'
            );
            triggerNotification(
              'sync',
              'AniList Account Linked',
              `Logged in as ${user.name}. Two-way cloud synchronization is now enabled.`,
            );
          }
        })
        .catch(err => {
          console.error('OAuth token verification failed:', err);
          showToast('error', 'Failed to authenticate AniList token.', 'Auth Error');
        });
    }
  }, [settings, showToast, triggerNotification]);

  // 1.5. Firebase Cross-Device Cloud Sync Listeners (Real-Time Library & Watch History)
  useEffect(() => {
    let unsubscribeLibrary: (() => void) | null = null;
    let unsubscribeHistory: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      if (firebaseUser) {
        // Enforce verified master email across settings
        const verifiedEmail = firebaseUser.email || 'shamu992728@gmail.com';
        if (settings.customEmail !== verifiedEmail) {
          const updatedSettings: UserSettings = {
            ...settings,
            customEmail: verifiedEmail,
          };
          setSettings(updatedSettings);
          saveUserSettings(updatedSettings);
        }

        // Real-time Cloud Library listener across devices
        unsubscribeLibrary = subscribeToCloudLibrary(firebaseUser.uid, cloudItems => {
          if (cloudItems && cloudItems.length > 0) {
            setLibrary(prevLocal => {
              const itemMap = new Map<number, UserMediaListItem>();
              prevLocal.forEach(item => itemMap.set(item.mediaId, item));
              cloudItems.forEach(cloudItem => {
                const local = itemMap.get(cloudItem.mediaId);
                if (!local || (cloudItem.updatedAt && cloudItem.updatedAt >= (local.updatedAt || 0))) {
                  itemMap.set(cloudItem.mediaId, cloudItem);
                }
              });
              const merged = Array.from(itemMap.values());
              saveUserLibrary(merged);
              return merged;
            });
          }
        });

        // Real-time Cloud Watch History listener across devices
        unsubscribeHistory = subscribeToCloudWatchHistory(firebaseUser.uid, cloudHistory => {
          if (cloudHistory && cloudHistory.length > 0) {
            const localHistory = getStoredWatchHistory();
            const historyMap = new Map<string, typeof cloudHistory[0]>();
            localHistory.forEach(item => historyMap.set(`${item.animeId}-${item.episodeNumber}`, item));
            cloudHistory.forEach(cloudItem => {
              const key = `${cloudItem.animeId}-${cloudItem.episodeNumber}`;
              const local = historyMap.get(key);
              if (!local || (cloudItem.lastWatchedAt && cloudItem.lastWatchedAt >= (local.lastWatchedAt || 0))) {
                historyMap.set(key, cloudItem);
              }
            });
            const mergedHistory = Array.from(historyMap.values())
              .sort((a, b) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0))
              .slice(0, 50);
            saveStoredWatchHistory(mergedHistory);
          }
        });

        // Initial sync of profile metadata
        syncUserProfileToCloud(firebaseUser, settings, library.length).catch(e => {
          console.warn('Initial cloud profile sync warning:', e);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeLibrary) unsubscribeLibrary();
      if (unsubscribeHistory) unsubscribeHistory();
    };
  }, [settings.customEmail]);

  // 2. Fetch Initial Catalog from AniList GraphQL (Live AniList Sync)
  const loadHomeContent = useCallback(async () => {
    setIsMainLoading(true);
    try {
      const feed = await fetchHomeFeed(24);
      setTrendingAnime(feed.trending);
      setPopularAnime(feed.popular);
      setTopRatedAnime(feed.topRated);
      setNewestAnime(feed.newest);
      setUpcomingAnime(feed.upcoming);
      setMoviesAnime(feed.movies);
      setActionAnime(feed.action);
      setFantasyAnime(feed.fantasy);
      setRomComAnime(feed.romcom);
    } catch (err: any) {
      console.error('Error loading home content:', err);
      // Only notify if we don't already have catalog in state
      if (trendingAnime.length === 0) {
        showToast('error', 'AniList rate limit or network issue. Serving cached catalog.', 'Catalog Notice');
      }
    } finally {
      setIsMainLoading(false);
    }
  }, [showToast, trendingAnime.length]);

  useEffect(() => {
    loadHomeContent();
  }, [loadHomeContent]);

  // Two-Way Sync Dispatcher
  const performAniListSync = async (anime: Anime, updates: { status?: MediaListStatus; progress?: number; score?: number }) => {
    if (!settings.twoWaySyncEnabled || !settings.anilistToken) {
      return;
    }

    try {
      await saveMediaListEntry(settings.anilistToken, {
        mediaId: anime.id,
        status: settings.syncWatchStatus ? updates.status : undefined,
        progress: settings.syncEpisodeProgress ? updates.progress : undefined,
        score: settings.syncScores && updates.score !== undefined ? updates.score * 10 : undefined,
      });

      const title = anime.title?.english || anime.title?.romaji || 'Anime';
      triggerNotification(
        'sync',
        'AniList Cloud Synced',
        `Synced updates for "${title}" to your AniList profile.`,
        anime,
        updates.progress
      );
    } catch (err) {
      console.error('AniList 2-way sync error:', err);
      showToast('error', 'Could not sync changes to AniList cloud.', 'Sync Error');
    }
  };

  // User Library Handlers
  const handleUpdateStatus = (anime: Anime, status: MediaListStatus) => {
    const updated = updateLibraryItem(library, anime, { status });
    setLibrary(updated);
    saveUserLibrary(updated);

    const title = anime.title?.english || anime.title?.romaji || 'Anime';
    showToast('success', `Moved "${title}" to ${status.toLowerCase()} list.`, 'Library Updated');
    performAniListSync(anime, { status });
  };

  const handleUpdateProgress = (anime: Anime, progress: number) => {
    const updated = updateLibraryItem(library, anime, { progress });
    setLibrary(updated);
    saveUserLibrary(updated);

    const title = anime.title?.english || anime.title?.romaji || 'Anime';
    showToast('info', `Updated "${title}" progress to Episode ${progress}.`, 'Progress Saved');
    performAniListSync(anime, { progress });
  };

  const handleUpdateScore = (anime: Anime, score: number) => {
    const updated = updateLibraryItem(library, anime, { score });
    setLibrary(updated);
    saveUserLibrary(updated);

    const title = anime.title?.english || anime.title?.romaji || 'Anime';
    showToast('info', `Rated "${title}" ${score}/10.`, 'Score Saved');
    performAniListSync(anime, { score });
  };

  // Quick Add from Card
  const handleQuickAdd = (anime: Anime, status: MediaListStatus = 'CURRENT') => {
    handleUpdateStatus(anime, status);
  };

  // Open Details Modal
  const handleOpenDetails = (anime: Anime) => {
    setSelectedAnime(anime);
    setStreamInitialEpisode(undefined);
    setStreamInitialTime(undefined);
    setStartInWatchMode(false);
    setIsDetailModalOpen(true);
  };

  // Open Direct Stream / Watch with Live Resume on dedicated Watch page
  const handlePlayStream = (anime: Anime, episodeNumber?: number, startTime?: number) => {
    setIsDetailModalOpen(false);
    setActiveWatchEpisode({
      anime,
      episodeNumber: episodeNumber || 1,
      startTime: startTime || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open Trailer Modal
  const handleOpenTrailer = (trailer: AnimeTrailer, title: string) => {
    setTrailerData({ trailer, title });
  };

  // Genre & Studio Filters Navigation -> Switch to Discover/Search Tab
  const handleSelectGenre = (_genre: string) => {
    setCurrentTab('discover');
  };

  const handleSelectStudio = (studio: string) => {
    setSelectedStudioForSearch(studio);
    setCurrentTab('discover');
  };

  // Save Settings
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettings(newSettings);
    showToast('success', 'Preferences and sync configurations updated.', 'Settings Saved');
  };

  // Import Playlist (Option 1)
  const handleImportPlaylist = (importedItems: UserMediaListItem[], username: string) => {
    const map = new Map<number, UserMediaListItem>();
    library.forEach(i => map.set(i.mediaId, i));
    importedItems.forEach(i => map.set(i.mediaId, i));
    const merged = Array.from(map.values());

    setLibrary(merged);
    saveUserLibrary(merged);
    triggerNotification(
      'library',
      'AniList Import Finished',
      `Imported ${importedItems.length} entries from ${username}'s public playlist.`,
    );
  };

  // Export / Import Backup Files
  const handleExportBackup = () => {
    exportLibraryAsJSON(library, settings);
    showToast('success', 'Downloaded library backup JSON file.', 'Export Complete');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importLibraryFromJSON(
      file,
      (importedLib, importedSettings) => {
        const map = new Map<number, UserMediaListItem>();
        library.forEach(i => map.set(i.mediaId, i));
        importedLib.forEach(i => map.set(i.mediaId, i));
        const merged = Array.from(map.values());

        setLibrary(merged);
        saveUserLibrary(merged);

        if (importedSettings) {
          const mergedSettings: UserSettings = { ...settings, ...importedSettings };
          setSettings(mergedSettings);
          saveUserSettings(mergedSettings);
        }

        showToast('success', `Restored ${importedLib.length} anime entries from backup!`, 'Backup Restored');
      },
      errorMsg => {
        showToast('error', errorMsg, 'Restore Failed');
      }
    );
  };

  // Send Test Notification
  const handleSendTestNotification = () => {
    const sample = trendingAnime[0] || popularAnime[0];
    const sampleTitle = sample?.title?.english || sample?.title?.romaji || 'Solo Leveling Season 2';
    
    triggerNotification(
      'airing',
      `Episode Airing: ${sampleTitle}`,
      `Episode 8 of ${sampleTitle} has just broadcasted and is now available to stream in HD.`,
      sample,
      8
    );
    showToast('success', `Test notification dispatched: "${sampleTitle}"! Check the Bell icon.`, 'Notification Sent');
  };

  // Notification Center Handlers
  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('info', 'All notifications marked as read.', 'Cleared');
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    showToast('info', 'Notification history cleared.', 'Notifications Cleared');
  };

  // Selected anime user tracking item
  const selectedAnimeUserItem = selectedAnime ? library.find(item => item.mediaId === selectedAnime.id) : undefined;

  // Global shortcut listener for '?' to open Keyboard Shortcuts modal
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white pb-24 lg:pb-12 relative overflow-x-hidden">
      {/* Frosted Glass Ambient Lighting Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-purple-600/25 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[5%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[35%] h-[35%] bg-pink-500/20 rounded-full blur-[130px]" />
        <div className="absolute top-[60%] left-[10%] w-[30%] h-[30%] bg-indigo-600/15 rounded-full blur-[140px]" />
      </div>

      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Persistent App Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={tab => {
          setActiveWatchEpisode(null);
          setCurrentTab(tab);
        }}
        settings={settings}
        libraryCount={library.length}
        notifications={notifications}
        isPlaying={Boolean(activeWatchEpisode)}
        onMarkAsRead={handleMarkNotificationAsRead}
        onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        onClearAll={handleClearAllNotifications}
        onOpenDetails={handleOpenDetails}
        onPlayStream={handlePlayStream}
        onOpenAiSensei={() => {
          soundEffects.playClick();
          setAiContextAnime(null);
          setIsAiModalOpen(true);
        }}
        onOpenGacha={() => {
          soundEffects.playClick();
          setIsGachaModalOpen(true);
        }}
      />

      {/* Main View Container */}
      <main className="flex-1 relative z-10">
        {/* VIEW 0: DEDICATED FULL-PAGE WATCH VIEW */}
        {activeWatchEpisode ? (
          <WatchView
            anime={activeWatchEpisode.anime}
            episodeNumber={activeWatchEpisode.episodeNumber}
            initialTime={activeWatchEpisode.startTime || 0}
            onBack={() => setActiveWatchEpisode(null)}
            onEpisodeChange={ep => {
              setActiveWatchEpisode(prev => (prev ? { ...prev, episodeNumber: ep, startTime: 0 } : null));
            }}
            onUpdateStatus={handleUpdateStatus}
            onUpdateProgress={handleUpdateProgress}
            onOpenDetails={anime => handleOpenDetails(anime)}
            userItem={library.find(item => item.mediaId === activeWatchEpisode.anime.id)}
            isTwoWaySyncActive={Boolean(settings.twoWaySyncEnabled && settings.anilistToken)}
          />
        ) : (
          <>
            {/* VIEW 1: HOME (Hero Spotlight, Continue Watching, Categories: Trending, Popular, Top Rated, Newest) */}
            {currentTab === 'home' && (
              <div className="space-y-8 pb-12">
                {/* Hero Carousel Spotlight */}
                {trendingAnime.length > 0 && (
                  <HeroSpotlight
                    animeList={trendingAnime.slice(0, 5)}
                    onOpenDetails={handleOpenDetails}
                    onPlayStream={handlePlayStream}
                    onQuickTrack={handleQuickAdd}
                    userLibrary={library}
                  />
                )}

                {/* Home Content Container */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                  {/* 1. Continue Watching / Watch History Section */}
                  <ContinueWatchingSection
                    onOpenDetails={handleOpenDetails}
                    onPlayStream={handlePlayStream}
                    onUpdateStatus={handleUpdateStatus}
                    onExploreTrending={() => {
                      window.scrollTo({ top: 450, behavior: 'smooth' });
                    }}
                  />

                  {/* Horizontal Category Rows */}
                  <div className="space-y-8 pt-2">
                    {/* Trending Now */}
                    {trendingAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Trending Now"
                        category="trending"
                        animeList={trendingAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Most Popular */}
                    {popularAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Most Popular Anime"
                        category="popular"
                        animeList={popularAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Top Rated All-Time */}
                    {topRatedAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Top Rated of All Time"
                        category="topRated"
                        animeList={topRatedAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Newest Releases & Episodes */}
                    {newestAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Newest Releases & Episodes"
                        category="newest"
                        animeList={newestAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Highly Anticipated & Upcoming */}
                    {upcomingAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Upcoming & Most Anticipated"
                        category="upcoming"
                        animeList={upcomingAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Anime Movies & Feature Films */}
                    {moviesAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Anime Movies & Films"
                        category="movies"
                        animeList={moviesAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Top Action & Battle Shonen */}
                    {actionAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Top Action & Battle Anime"
                        category="action"
                        animeList={actionAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Top Fantasy & Supernatural */}
                    {fantasyAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Top Fantasy & Magic"
                        category="fantasy"
                        animeList={fantasyAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}

                    {/* Top Rom-Com & Romantic Comedy */}
                    {romComAnime.length > 0 && (
                      <HorizontalAnimeRow
                        title="Top Rom-Com & Romantic Comedy"
                        category="romcom"
                        animeList={romComAnime}
                        userLibrary={library}
                        isLoading={isMainLoading}
                        onOpenDetails={handleOpenDetails}
                        onPlayStream={handlePlayStream}
                        onUpdateStatus={handleUpdateStatus}
                        onUpdateProgress={handleUpdateProgress}
                        onSelectGenre={handleSelectGenre}
                        onSelectStudio={handleSelectStudio}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: DEDICATED SEARCH & MULTI-CATEGORY DISCOVERY */}
            {currentTab === 'discover' && (
              <SearchView
                initialStudio={selectedStudioForSearch}
                onClearStudio={() => setSelectedStudioForSearch(null)}
                userLibrary={library}
                onOpenDetails={handleOpenDetails}
                onPlayStream={handlePlayStream}
                onUpdateStatus={handleUpdateStatus}
                onUpdateProgress={handleUpdateProgress}
                onSelectGenre={handleSelectGenre}
                onSelectStudio={handleSelectStudio}
              />
            )}

            {/* VIEW 3: ARCADE MINI-GAMES & CHARACTER GACHA */}
            {currentTab === 'arcade' && (
              <ArcadeView
                onOpenDetails={handleOpenDetails}
                onNavigateToLibrary={() => setCurrentTab('library')}
              />
            )}

            {/* VIEW 4: SCHEDULE AIRING CALENDAR */}
            {currentTab === 'schedule' && (
              <ScheduleView
                onOpenDetails={handleOpenDetails}
                onPlayStream={handlePlayStream}
                userLibrary={library}
                onQuickTrack={handleQuickAdd}
              />
            )}

            {/* VIEW 5: MY WATCHLIST & LIBRARY */}
            {currentTab === 'library' && (
              <MyLibraryView
                library={library}
                onOpenDetails={handleOpenDetails}
                onPlayStream={handlePlayStream}
                onUpdateStatus={handleUpdateStatus}
                onUpdateProgress={handleUpdateProgress}
                onGoToDiscover={() => setCurrentTab('home')}
                onSelectGenre={handleSelectGenre}
                onSelectStudio={handleSelectStudio}
                isTwoWaySyncActive={Boolean(settings.twoWaySyncEnabled && (settings.anilistToken || settings.importUsername))}
              />
            )}

            {/* VIEW 6: ACCOUNT & CLOUD PERSISTENCE */}
            {currentTab === 'account' && (
              <AccountView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                onImportList={handleImportPlaylist}
                onShowToast={showToast}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                libraryCount={library.length}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Action Bar: AI Sensei & Shortcuts */}
      <div className="fixed bottom-16 lg:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => setIsShortcutsModalOpen(true)}
          className="hidden sm:flex p-3 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/70 backdrop-blur-xl shadow-xl transition active:scale-95 cursor-pointer"
          title="Keyboard Shortcuts Guide (?)"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            setAiContextAnime(null);
            setIsAiModalOpen(true);
          }}
          className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-xs shadow-xl shadow-indigo-600/40 hover:shadow-indigo-500/60 border border-indigo-400/40 hover:scale-105 transition active:scale-95 cursor-pointer"
          title="Open AniAI Sensei Chatbot"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="hidden sm:inline">Ask Sensei</span>
        </button>
      </div>

      {/* Mobile Bottom Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={tab => {
          setActiveWatchEpisode(null);
          setCurrentTab(tab);
        }}
        settings={settings}
        libraryCount={library.length}
        onOpenAiSensei={() => {
          setAiContextAnime(null);
          setIsAiModalOpen(true);
        }}
      />

      {/* Detailed Anime Modal / Page View */}
      <AnimeDetailModal
        anime={selectedAnime}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        userItem={selectedAnimeUserItem}
        onUpdateStatus={handleUpdateStatus}
        onUpdateProgress={handleUpdateProgress}
        onUpdateScore={handleUpdateScore}
        onOpenTrailer={handleOpenTrailer}
        onNavigateToAnime={anime => {
          setSelectedAnime(anime);
        }}
        onSelectGenre={handleSelectGenre}
        onSelectStudio={handleSelectStudio}
        isTwoWaySyncActive={Boolean(settings.twoWaySyncEnabled && settings.anilistToken)}
        initialEpisode={streamInitialEpisode}
        initialTime={streamInitialTime}
        startInWatchMode={startInWatchMode}
        onPlayStream={handlePlayStream}
      />

      {/* Trailer Player Modal */}
      {trailerData && (
        <TrailerModal
          trailer={trailerData.trailer}
          animeTitle={trailerData.title}
          isOpen={Boolean(trailerData)}
          onClose={() => setTrailerData(null)}
        />
      )}

      {/* AniAI Anime Sensei AI Chat Assistant Modal */}
      <AiAnimeSenseiModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentAnime={aiContextAnime || selectedAnime}
        userLibrary={library}
        onOpenDetails={handleOpenDetails}
        onPlayStream={handlePlayStream}
      />

      {/* Anime Gacha & Rarity Summon Modal */}
      <AnimeGachaModal
        isOpen={isGachaModalOpen}
        onClose={() => setIsGachaModalOpen(false)}
        onOpenDetails={handleOpenDetails}
        onPlayStream={handlePlayStream}
        onUpdateStatus={handleUpdateStatus}
        userLibrary={library}
      />

      {/* Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

export default App;
