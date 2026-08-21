import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserSettings, UserMediaListItem } from '../types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Context: ', JSON.stringify(errInfo));
  return errInfo;
}

export interface AuthDomainErrorInfo {
  domain: string;
  projectId: string;
  consoleUrl: string;
  message: string;
}

// Authentication helper functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const errCode = error?.code || '';
    const errMessage = error?.message || '';

    if (errCode === 'auth/unauthorized-domain' || errMessage.includes('unauthorized-domain')) {
      const currentDomain = typeof window !== 'undefined' ? window.location.hostname : 'current-domain';
      const projectId = firebaseConfig.projectId || 'gen-lang-client-0984646652';
      const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

      const domainError: any = new Error(
        `Domain "${currentDomain}" is not authorized for Firebase Auth. Add it in Firebase Console: ${consoleUrl}`
      );
      domainError.code = 'auth/unauthorized-domain';
      domainError.domainInfo = {
        domain: currentDomain,
        projectId,
        consoleUrl,
        message: 'This domain must be added to Authorized Domains in Firebase Authentication Settings.'
      } as AuthDomainErrorInfo;

      console.warn('Firebase Auth Unauthorized Domain:', domainError.domainInfo);
      throw domainError;
    }

    console.error('Google Sign-in Error:', error);
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error: any) {
    console.error('Sign-out Error:', error);
    throw error;
  }
};

// Firestore User Profile Sync
export const syncUserProfileToCloud = async (
  user: FirebaseUser,
  settings: Partial<UserSettings>,
  libraryCount: number = 0
) => {
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        userId: user.uid,
        displayName: settings.customDisplayName || user.displayName || 'Anime Fan',
        email: user.email || 'shamu992728@gmail.com', // Strict Firebase Google Account Email
        photoURL: settings.customAvatar || user.photoURL || '',
        lastActiveAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
        libraryCount,
        profiles: settings.profiles || [],
        currentProfileId: settings.currentProfileId || null,
        profilePinEnabled: settings.profilePinEnabled || false,
        profilePin: settings.profilePin || null,
        contentRestrictions: settings.contentRestrictions || false,
        importUsername: settings.importUsername || null,
        anilistToken: settings.anilistToken || null,
        twoWaySyncEnabled: settings.twoWaySyncEnabled ?? true,
        preferences: {
          preferredAudio: settings.preferredAudio || 'sub',
          theme: settings.theme || 'midnight',
          autoPlayNextEpisode: settings.autoPlayNextEpisode ?? true,
          notificationsEnabled: settings.notificationsEnabled ?? true,
          notifyAiringEpisodes: settings.notifyAiringEpisodes ?? true,
          syncScores: settings.syncScores ?? true,
          syncEpisodeProgress: settings.syncEpisodeProgress ?? true,
          syncWatchStatus: settings.syncWatchStatus ?? true,
        },
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    console.error('Error syncing profile to Firestore:', error);
  }
};

// Save an item to Cloud Firestore Library
export const saveAnimeToCloudLibrary = async (
  userId: string,
  item: UserMediaListItem
) => {
  if (!userId || !item?.mediaId) return;
  const path = `users/${userId}/library/${item.mediaId}`;
  try {
    const itemRef = doc(db, 'users', userId, 'library', String(item.mediaId));
    await setDoc(
      itemRef,
      {
        animeId: item.mediaId,
        userId,
        title: item.media?.title?.userPreferred || item.media?.title?.english || item.media?.title?.romaji || 'Anime',
        coverImage: item.media?.coverImage?.large || item.media?.coverImage?.medium || '',
        status: item.status,
        progress: item.progress,
        score: item.score,
        updatedAt: item.updatedAt || Date.now(),
        media: item.media,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    console.error('Error saving anime to cloud library:', error);
  }
};

// Remove an item from Cloud Firestore Library
export const removeAnimeFromCloudLibrary = async (
  userId: string,
  animeId: number
) => {
  if (!userId || !animeId) return;
  const path = `users/${userId}/library/${animeId}`;
  try {
    const itemRef = doc(db, 'users', userId, 'library', String(animeId));
    await deleteDoc(itemRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    console.error('Error removing anime from cloud library:', error);
  }
};

// Real-time Cloud Library Listener (for multi-device sync)
export const subscribeToCloudLibrary = (
  userId: string,
  onUpdate: (items: UserMediaListItem[]) => void
) => {
  if (!userId) return () => {};
  const path = `users/${userId}/library`;
  try {
    const libCollection = collection(db, 'users', userId, 'library');
    return onSnapshot(
      libCollection,
      snapshot => {
        const items: UserMediaListItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.animeId && data.media) {
            items.push({
              mediaId: data.animeId,
              status: data.status || 'PLANNING',
              progress: data.progress || 0,
              score: data.score || 0,
              updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
              media: data.media,
            });
          }
        });
        onUpdate(items);
      },
      error => {
        handleFirestoreError(error, OperationType.GET, path);
        console.warn('Notice for Cloud Library listener:', error);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    console.warn('Failed to setup Cloud Library subscription:', err);
    return () => {};
  }
};

// Save Watch History Item to Cloud Firestore (Real-time Cross-Device Resume)
export const saveWatchHistoryToCloud = async (
  userId: string,
  entry: import('../types').WatchHistoryEntry
) => {
  if (!userId || !entry?.animeId || !entry?.episodeNumber) return;
  const historyId = `${entry.animeId}_${entry.episodeNumber}`;
  const path = `users/${userId}/watchHistory/${historyId}`;
  try {
    const historyRef = doc(db, 'users', userId, 'watchHistory', historyId);
    await setDoc(
      historyRef,
      {
        id: historyId,
        userId,
        animeId: entry.animeId,
        episodeNumber: entry.episodeNumber,
        episodeTitle: entry.episodeTitle || '',
        seasonTitle: entry.seasonTitle || '',
        currentTime: entry.currentTime,
        duration: entry.duration,
        lastWatchedAt: entry.lastWatchedAt || Date.now(),
        completed: Boolean(entry.completed),
        thumbnailStyle: entry.thumbnailStyle || 'snapshot',
        anime: entry.anime,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    console.error('Error saving watch history to Firestore:', error);
  }
};

// Real-time Cloud Watch History Listener (Cross-Device Sync)
export const subscribeToCloudWatchHistory = (
  userId: string,
  onUpdate: (history: import('../types').WatchHistoryEntry[]) => void
) => {
  if (!userId) return () => {};
  const path = `users/${userId}/watchHistory`;
  try {
    const historyCollection = collection(db, 'users', userId, 'watchHistory');
    return onSnapshot(
      historyCollection,
      snapshot => {
        const history: import('../types').WatchHistoryEntry[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.animeId && data.episodeNumber && data.anime) {
            history.push({
              animeId: data.animeId,
              episodeNumber: data.episodeNumber,
              episodeTitle: data.episodeTitle,
              seasonTitle: data.seasonTitle,
              currentTime: data.currentTime || 0,
              duration: data.duration || 1440,
              lastWatchedAt: data.lastWatchedAt || Date.now(),
              completed: Boolean(data.completed),
              thumbnailStyle: data.thumbnailStyle || 'snapshot',
              anime: data.anime,
            });
          }
        });
        // Sort descending by lastWatchedAt
        history.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
        onUpdate(history);
      },
      error => {
        handleFirestoreError(error, OperationType.GET, path);
        console.warn('Notice for Cloud Watch History listener:', error);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    console.warn('Failed to setup Cloud Watch History subscription:', err);
    return () => {};
  }
};

// Save Quiz Score Record to Cloud Firestore
export const saveQuizScoreToCloud = async (
  userId: string,
  animeId: number,
  animeTitle: string,
  score: number,
  total: number = 5
) => {
  if (!userId) return;
  const scoreId = `${animeId}_${Date.now()}`;
  const path = `users/${userId}/quizScores/${scoreId}`;
  try {
    const scoreRef = doc(db, 'users', userId, 'quizScores', scoreId);
    await setDoc(scoreRef, {
      id: scoreId,
      userId,
      animeId,
      animeTitle,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    console.error('Error saving quiz score:', error);
  }
};

