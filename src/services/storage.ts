import { UserMediaListItem, UserSettings, Anime, EpisodeNote, AppTheme, WatchHistoryEntry } from '../types';
import { auth, saveWatchHistoryToCloud, saveAnimeToCloudLibrary, removeAnimeFromCloudLibrary, syncUserProfileToCloud } from '../lib/firebase';

const SETTINGS_KEY = 'anilove_settings_v3';
const SETTINGS_KEY_LEGACY = 'anilili_settings_v3';
const LIBRARY_KEY = 'anilove_library_v3';
const LIBRARY_KEY_LEGACY = 'anilili_library_v3';
const NOTIFICATIONS_KEY = 'anilove_notifications_v3';
const NOTIFICATIONS_KEY_LEGACY = 'anilili_notifications_v3';
const EPISODE_NOTES_KEY = 'anilove_episode_notes_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'midnight',
  twoWaySyncEnabled: true,
  syncEpisodeProgress: true,
  syncWatchStatus: true,
  syncScores: true,
  anilistToken: null,
  anilistUser: null,
  importUsername: null,
  autoSyncAniList: true,
  lastSyncTimestamp: null,
  currentProfileId: 'profile-main',
  profiles: [
    {
      id: 'profile-main',
      name: 'Anime Explorer',
      avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
      email: 'shamu992728@gmail.com',
      createdAt: Date.now(),
    },
    {
      id: 'profile-otaku',
      name: 'Otaku Mode',
      avatar: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&auto=format&fit=crop&q=80',
      email: 'otaku@anilove.app',
      createdAt: Date.now(),
    }
  ],
  profilePin: null,
  profilePinEnabled: false,
  customDisplayName: 'Anime Explorer',
  customEmail: 'shamu992728@gmail.com',
  customAvatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
  contentRestrictions: false, // by default off
  notificationsEnabled: true,
  notifyAiringEpisodes: true,
  notifySyncUpdates: true,
  notifyDailyDigest: true,
  browserPushEnabled: false,
  preferredAudio: 'sub',
  preferredLanguages: ['SUB', 'DUB'],
  preferredServers: ['official-link'],
  autoPlayNextEpisode: true,
  defaultStreamServer: 'auto',
  ambientGlowEnabled: true,
  autoSkipIntro: false,
  equalizerPreset: 'flat',
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(SETTINGS_KEY_LEGACY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    let theme: AppTheme = parsed.theme;
    if (parsed.theme === 'dark') theme = 'midnight';
    return { ...DEFAULT_SETTINGS, ...parsed, theme };
  } catch (e) {
    console.error('Error reading stored settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export const getUserSettings = getStoredSettings;

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (auth.currentUser) {
      const currentLib = getStoredLibrary();
      syncUserProfileToCloud(auth.currentUser, settings, currentLib.length).catch(err => {
        console.warn('Firebase settings cloud sync warning:', err);
      });
    }
  } catch (e) {
    console.error('Error saving stored settings:', e);
  }
}

export const saveUserSettings = saveStoredSettings;

export function getStoredLibrary(): UserMediaListItem[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY) || localStorage.getItem(LIBRARY_KEY_LEGACY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored library:', e);
    return [];
  }
}

export const getUserLibrary = getStoredLibrary;

export function saveStoredLibrary(items: UserMediaListItem[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving stored library:', e);
  }
}

export const saveUserLibrary = saveStoredLibrary;

export function updateLibraryItem(
  library: UserMediaListItem[],
  anime: Anime,
  updates: Partial<UserMediaListItem>
): UserMediaListItem[] {
  const index = library.findIndex(i => i.mediaId === anime.id);
  let updated: UserMediaListItem[];
  let targetItem: UserMediaListItem;

  if (index >= 0) {
    targetItem = {
      ...library[index],
      ...updates,
      media: anime,
      updatedAt: Date.now(),
    };
    updated = [...library];
    updated[index] = targetItem;
  } else {
    targetItem = {
      mediaId: anime.id,
      status: updates.status || 'PLANNING',
      progress: updates.progress || 0,
      score: updates.score || 0,
      updatedAt: Date.now(),
      media: anime,
      ...updates,
    };
    updated = [targetItem, ...library];
  }

  saveStoredLibrary(updated);

  // Sync to Firebase Cloud if authenticated
  if (auth.currentUser) {
    saveAnimeToCloudLibrary(auth.currentUser.uid, targetItem).catch(err => {
      console.warn('Firebase library cloud sync warning:', err);
    });
  }

  return updated;
}

export const upsertLibraryItem = (library: UserMediaListItem[], item: UserMediaListItem) =>
  updateLibraryItem(library, item.media, item);

export function removeLibraryItem(library: UserMediaListItem[], mediaId: number): UserMediaListItem[] {
  const updated = library.filter(i => i.mediaId !== mediaId);
  saveStoredLibrary(updated);

  // Sync removal to Firebase Cloud if authenticated
  if (auth.currentUser) {
    removeAnimeFromCloudLibrary(auth.currentUser.uid, mediaId).catch(err => {
      console.warn('Firebase library cloud remove warning:', err);
    });
  }

  return updated;
}

export function exportLibraryAsJSON(library: UserMediaListItem[], settings?: UserSettings): void {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '3.0',
    library,
    settings: settings ? { theme: settings.theme, importUsername: settings.importUsername } : undefined,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anilove-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportLibraryToJson = (library: UserMediaListItem[]) => exportLibraryAsJSON(library);

export function importLibraryFromJSON(
  file: File,
  onSuccess: (library: UserMediaListItem[], settings?: UserSettings) => void,
  onError: (errorMsg: string) => void
): void {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);
      const importedLib: UserMediaListItem[] = Array.isArray(parsed) ? parsed : parsed.library || [];
      if (!Array.isArray(importedLib)) {
        throw new Error('Invalid JSON format: missing library array.');
      }
      onSuccess(importedLib, parsed.settings);
    } catch (err: any) {
      onError(err.message || 'Failed to parse JSON backup file.');
    }
  };
  reader.onerror = () => {
    onError('Failed to read file from disk.');
  };
  reader.readAsText(file);
}

export const importLibraryFromJson = (jsonStr: string, currentLibrary: UserMediaListItem[]): UserMediaListItem[] => {
  const data = JSON.parse(jsonStr);
  const importedItems: UserMediaListItem[] = Array.isArray(data) ? data : data.library || [];
  const map = new Map<number, UserMediaListItem>();
  currentLibrary.forEach(item => map.set(item.mediaId, item));
  importedItems.forEach(item => {
    if (item.mediaId && item.media) {
      map.set(item.mediaId, item);
    }
  });
  const merged = Array.from(map.values());
  saveStoredLibrary(merged);
  return merged;
};

export function getStoredNotifications(): import('../types').AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY) || localStorage.getItem(NOTIFICATIONS_KEY_LEGACY);
    if (!raw) {
      return [
        {
          id: 'welcome-1',
          type: 'system',
          title: 'Welcome to AniLove PRO!',
          message: 'Explore trending anime, track episodes with AniList two-way sync, and monitor weekly schedules.',
          timestamp: Date.now() - 3600000,
          read: false,
        },
      ];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored notifications:', e);
    return [];
  }
}

export function saveStoredNotifications(notifications: import('../types').AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Error saving stored notifications:', e);
  }
}

const WATCH_HISTORY_KEY = 'anilove_watch_history_v2';
const WATCH_HISTORY_KEY_LEGACY = 'anilove_watch_history_v1';

export function getStoredWatchHistory(): import('../types').WatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_KEY) || localStorage.getItem(WATCH_HISTORY_KEY_LEGACY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading stored watch history:', e);
    return [];
  }
}

export function saveStoredWatchHistory(history: import('../types').WatchHistoryEntry[]): void {
  try {
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving stored watch history:', e);
  }
}

export function recordWatchProgress(entry: {
  anime: import('../types').Anime;
  episodeNumber: number;
  episodeTitle?: string;
  seasonTitle?: string;
  currentTime: number;
  duration: number;
  thumbnailStyle?: import('../types').ThumbnailAppearance;
}): import('../types').WatchHistoryEntry[] {
  const currentHistory = getStoredWatchHistory();
  const existingIdx = currentHistory.findIndex(
    h => h.animeId === entry.anime.id && h.episodeNumber === entry.episodeNumber
  );

  const newEntry: import('../types').WatchHistoryEntry = {
    animeId: entry.anime.id,
    anime: entry.anime,
    episodeNumber: entry.episodeNumber,
    episodeTitle: entry.episodeTitle,
    seasonTitle: entry.seasonTitle,
    currentTime: Math.max(0, Math.round(entry.currentTime)),
    duration: Math.max(1, Math.round(entry.duration || 1440)),
    lastWatchedAt: Date.now(),
    thumbnailStyle: entry.thumbnailStyle || 'snapshot',
    completed: entry.duration > 0 && entry.currentTime / entry.duration > 0.9,
  };

  let updated: import('../types').WatchHistoryEntry[];
  if (existingIdx >= 0) {
    updated = [...currentHistory];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...newEntry,
      thumbnailStyle: entry.thumbnailStyle || updated[existingIdx].thumbnailStyle || 'snapshot',
    };
    // Move to top
    const [item] = updated.splice(existingIdx, 1);
    updated.unshift(item);
  } else {
    // If different episode of same anime exists, we keep entries but put newest on top
    updated = [newEntry, ...currentHistory.filter(h => !(h.animeId === entry.anime.id && h.episodeNumber === entry.episodeNumber))];
  }

  // Keep max 50 recent items
  updated = updated.slice(0, 50);
  saveStoredWatchHistory(updated);

  // Sync watch progress to Firebase Cloud for cross-device resume
  if (auth.currentUser) {
    saveWatchHistoryToCloud(auth.currentUser.uid, newEntry).catch(err => {
      console.warn('Firebase watch history cloud sync warning:', err);
    });
  }

  return updated;
}

export function removeWatchHistoryItem(animeId: number, episodeNumber?: number): import('../types').WatchHistoryEntry[] {
  const current = getStoredWatchHistory();
  const updated = current.filter(item => {
    if (item.animeId !== animeId) return true;
    if (episodeNumber !== undefined && item.episodeNumber !== episodeNumber) return true;
    return false;
  });
  saveStoredWatchHistory(updated);
  return updated;
}

export function updateWatchHistoryThumbnailStyle(
  animeId: number,
  thumbnailStyle: import('../types').ThumbnailAppearance
): import('../types').WatchHistoryEntry[] {
  const current = getStoredWatchHistory();
  const updated = current.map(item => (item.animeId === animeId ? { ...item, thumbnailStyle } : item));
  saveStoredWatchHistory(updated);
  return updated;
}

export function clearWatchHistory(): void {
  saveStoredWatchHistory([]);
}

export function getStoredEpisodeNotes(animeId?: number, episodeNumber?: number): EpisodeNote[] {
  try {
    const raw = localStorage.getItem(EPISODE_NOTES_KEY);
    if (!raw) return [];
    const notes: EpisodeNote[] = JSON.parse(raw);
    if (animeId !== undefined && episodeNumber !== undefined) {
      return notes.filter(n => n.animeId === animeId && n.episodeNumber === episodeNumber);
    }
    if (animeId !== undefined) {
      return notes.filter(n => n.animeId === animeId);
    }
    return notes;
  } catch (e) {
    console.error('Error reading episode notes:', e);
    return [];
  }
}

export function saveStoredEpisodeNote(note: Omit<EpisodeNote, 'id' | 'createdAt'>): EpisodeNote[] {
  try {
    const allNotes = getStoredEpisodeNotes();
    const newNote: EpisodeNote = {
      ...note,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      createdAt: Date.now(),
    };
    const updated = [newNote, ...allNotes];
    localStorage.setItem(EPISODE_NOTES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving episode note:', e);
    return [];
  }
}

export function deleteStoredEpisodeNote(noteId: string): EpisodeNote[] {
  try {
    const allNotes = getStoredEpisodeNotes();
    const updated = allNotes.filter(n => n.id !== noteId);
    localStorage.setItem(EPISODE_NOTES_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting episode note:', e);
    return [];
  }
}

const GACHA_VAULT_KEY = 'anilove_gacha_vault_v1';
const TIER_LIST_KEY = 'anilove_tier_list_v1';

export function getStoredGachaVault(): import('../types').GachaCard[] {
  try {
    const raw = localStorage.getItem(GACHA_VAULT_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading gacha vault:', e);
    return [];
  }
}

export const getStoredGachaCards = getStoredGachaVault;

export function saveStoredGachaCards(cards: import('../types').GachaCard[]): void {
  try {
    localStorage.setItem(GACHA_VAULT_KEY, JSON.stringify(cards));
  } catch (e) {
    console.error('Error saving gacha cards:', e);
  }
}

export function saveGachaCardToVault(card: import('../types').GachaCard): import('../types').GachaCard[] {
  try {
    const current = getStoredGachaVault();
    const updated = [card, ...current];
    localStorage.setItem(GACHA_VAULT_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving gacha card:', e);
    return [];
  }
}

export function getStoredGachaSpinsUsed(): number {
  try {
    const raw = localStorage.getItem('anilove_gacha_spins_used_v1');
    if (!raw) return 0;
    const num = parseInt(raw, 10);
    return isNaN(num) ? 0 : num;
  } catch (e) {
    return 0;
  }
}

export function saveStoredGachaSpinsUsed(count: number): void {
  try {
    localStorage.setItem('anilove_gacha_spins_used_v1', Math.max(0, count).toString());
  } catch (e) {
    console.error('Error saving gacha spins used:', e);
  }
}

export function incrementGachaSpinsUsed(by: number = 1): number {
  const current = getStoredGachaSpinsUsed();
  const next = current + by;
  saveStoredGachaSpinsUsed(next);
  return next;
}


export function getStoredTierList(): import('../types').TierListEntry[] {
  try {
    const raw = localStorage.getItem(TIER_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading tier list:', e);
    return [];
  }
}

export const getStoredTierLists = getStoredTierList;

export function saveStoredTierList(entries: import('../types').TierListEntry[]): void {
  try {
    localStorage.setItem(TIER_LIST_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Error saving tier list:', e);
  }
}

export const saveStoredTierLists = saveStoredTierList;


