import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Bell,
  Sliders,
  ChevronRight,
  LogOut,
  Sparkles,
  Lock,
  Unlock,
  Volume2,
  Subtitles,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Mail,
  Smartphone,
  Flame,
  Award,
  Crown,
  KeyRound,
  Download,
  Upload,
  Globe,
  Check,
  Plus,
  Trash2,
  X,
  Eye,
  EyeOff,
  Radio,
  Image as ImageIcon,
  UserCheck,
  Copy,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSettings, UserMediaListItem, UserProfile } from '../types';
import { auth, signInWithGoogle, logoutUser, syncUserProfileToCloud } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { fetchUserMediaList, fetchAniListUserProfile, fetchViewerProfile, getAniListAuthUrl } from '../services/anilist';

interface AccountViewProps {
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onImportList: (items: UserMediaListItem[], username: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'sync', message: string, title?: string) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  libraryCount: number;
}

// Preset High-Resolution Anime Avatars
const PRESET_AVATARS = [
  {
    name: 'Tanjiro',
    url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Gojo / Cyber',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Sakura / Blade',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Shadow Sorcerer',
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Neon Shinobi',
    url: 'https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=400&auto=format&fit=crop&q=80',
  },
  {
    name: 'Aether Wanderer',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
  },
];

export const AccountView: React.FC<AccountViewProps> = ({
  settings,
  onSaveSettings,
  onImportList,
  onShowToast,
  onExportBackup,
  onImportBackup,
  libraryCount,
}) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authDomainError, setAuthDomainError] = useState<{ domain: string; projectId: string; consoleUrl: string } | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Modals state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSwitchProfileOpen, setIsSwitchProfileOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);

  // Edit Profile Form State
  const [editName, setEditName] = useState(settings.customDisplayName || 'Anime Explorer');
  const [editAvatar, setEditAvatar] = useState(settings.customAvatar || PRESET_AVATARS[0].url);
  const [customAvatarInput, setCustomAvatarInput] = useState('');

  // New Profile Form State
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileAvatar, setNewProfileAvatar] = useState(PRESET_AVATARS[1].url);

  // PIN Form State
  const [pinInput, setPinInput] = useState('');
  const [pinConfirmInput, setPinConfirmInput] = useState('');
  const [pinStep, setPinStep] = useState<'create' | 'verify' | 'remove'>('create');
  const [pinError, setPinError] = useState('');

  // AniList username & token sync state
  const [anilistUsernameInput, setAnilistUsernameInput] = useState(settings.importUsername || '');
  const [anilistTokenInput, setAnilistTokenInput] = useState(settings.anilistToken || '');
  const [isSyncingAniList, setIsSyncingAniList] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [isCloudResyncing, setIsCloudResyncing] = useState(false);

  // Profiles list fallback
  const profiles: UserProfile[] = settings.profiles && settings.profiles.length > 0
    ? settings.profiles
    : [
        {
          id: 'profile-main',
          name: settings.customDisplayName || 'Anime Explorer',
          avatar: settings.customAvatar || PRESET_AVATARS[0].url,
          email: settings.customEmail || 'shamu992728@gmail.com',
          createdAt: Date.now(),
        },
      ];

  const currentProfile = profiles.find(p => p.id === settings.currentProfileId) || profiles[0];

  // Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      if (user) {
        syncUserProfileToCloud(user, settings, libraryCount);
      }
    });
    return () => unsubscribe();
  }, [settings, libraryCount]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthDomainError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onShowToast(
          'success',
          `Welcome back, ${user.displayName || 'Anime Fan'}! Cloud sync active.`,
          'Signed In'
        );
        syncUserProfileToCloud(user, settings, libraryCount);
        // Automatically sync email & name if empty
        if (user.displayName || user.email) {
          const updated: UserSettings = {
            ...settings,
            customDisplayName: user.displayName || settings.customDisplayName,
            customEmail: user.email || settings.customEmail,
            customAvatar: user.photoURL || settings.customAvatar,
          };
          onSaveSettings(updated);
        }
      }
    } catch (err: any) {
      console.warn('Google Sign In failed:', err);
      const isUnauthorizedDomain = err?.code === 'auth/unauthorized-domain' || err?.domainInfo || String(err?.message || '').includes('unauthorized-domain');
      if (isUnauthorizedDomain) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'current-domain';
        const projectId = 'gen-lang-client-0984646652';
        const consoleUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;
        setAuthDomainError({
          domain,
          projectId,
          consoleUrl,
        });
        onShowToast(
          'info',
          `Domain "${domain}" requires authorization in Firebase Console, or activate Demo Cloud Profile.`,
          'Domain Authorization'
        );
      } else {
        onShowToast('error', err.message || 'Failed to sign in with Google.', 'Sign-In Failed');
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Activate Instant Demo / Guest Cloud Profile
  const handleActivateDemoAccount = (demoName: string = 'Kurogane Otaku', demoEmail: string = 'demo.fan@anilove.app') => {
    const avatar = PRESET_AVATARS[1].url;
    const demoProfile: UserProfile = {
      id: `profile-demo-${Date.now()}`,
      name: demoName,
      email: demoEmail,
      avatar,
      createdAt: Date.now(),
    };

    const updatedProfiles = [demoProfile, ...profiles.filter(p => p.id !== demoProfile.id)];
    const newSettings: UserSettings = {
      ...settings,
      currentProfileId: demoProfile.id,
      customDisplayName: demoName,
      customEmail: demoEmail,
      customAvatar: avatar,
      profiles: updatedProfiles,
    };

    onSaveSettings(newSettings);
    setAuthDomainError(null);
    onShowToast('success', `Welcome, ${demoName}! Demo Profile with local & cloud persistence is active.`, 'Profile Activated');
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await logoutUser();
      onShowToast('info', 'Signed out of cloud account. Switched to local profile.', 'Signed Out');
    } catch (err: any) {
      onShowToast('error', 'Error signing out.', 'Error');
    }
  };

  // Save Edited Profile (Name, Logo - Email is permanently bound to Firebase/Google Account)
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = editName.trim() || 'Anime Explorer';
    const finalAvatar = customAvatarInput.trim() || editAvatar;
    const masterEmail = currentUser?.email || settings.customEmail || 'shamu992728@gmail.com';

    // Update active profile in profiles array
    const updatedProfiles = profiles.map(p => {
      if (p.id === currentProfile.id) {
        return {
          ...p,
          name: finalName,
          email: masterEmail,
          avatar: finalAvatar,
        };
      }
      return p;
    });

    const newSettings: UserSettings = {
      ...settings,
      customDisplayName: finalName,
      customEmail: masterEmail,
      customAvatar: finalAvatar,
      profiles: updatedProfiles,
    };

    onSaveSettings(newSettings);
    setIsEditProfileOpen(false);
    onShowToast('success', 'Profile details updated successfully!', 'Profile Saved');
  };

  // Switch Active Profile
  const handleSwitchProfile = (profile: UserProfile) => {
    const masterEmail = currentUser?.email || settings.customEmail || 'shamu992728@gmail.com';
    const newSettings: UserSettings = {
      ...settings,
      currentProfileId: profile.id,
      customDisplayName: profile.name,
      customEmail: masterEmail,
      customAvatar: profile.avatar,
    };
    onSaveSettings(newSettings);
    setIsSwitchProfileOpen(false);
    onShowToast('info', `Switched active profile to "${profile.name}".`, 'Profile Switched');
  };

  // Create New Profile
  const handleCreateNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) {
      onShowToast('error', 'Please enter a name for the new profile.', 'Name Required');
      return;
    }

    const masterEmail = currentUser?.email || settings.customEmail || 'shamu992728@gmail.com';
    const newProf: UserProfile = {
      id: `profile-${Date.now()}`,
      name: newProfileName.trim(),
      avatar: newProfileAvatar,
      email: masterEmail,
      createdAt: Date.now(),
    };

    const updatedProfiles = [...profiles, newProf];
    const newSettings: UserSettings = {
      ...settings,
      profiles: updatedProfiles,
      currentProfileId: newProf.id,
      customDisplayName: newProf.name,
      customEmail: masterEmail,
      customAvatar: newProf.avatar,
    };

    onSaveSettings(newSettings);
    setNewProfileName('');
    setIsNewProfileModalOpen(false);
    setIsSwitchProfileOpen(false);
    onShowToast('success', `Created & switched to profile "${newProf.name}"!`, 'Profile Created');
  };

  // Delete Profile
  const handleDeleteProfile = (profileId: string, profileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      onShowToast('error', 'You must have at least one active profile.', 'Cannot Delete');
      return;
    }

    const remaining = profiles.filter(p => p.id !== profileId);
    const nextCurrent = remaining[0];
    const newSettings: UserSettings = {
      ...settings,
      profiles: remaining,
      currentProfileId: settings.currentProfileId === profileId ? nextCurrent.id : settings.currentProfileId,
      customDisplayName: settings.currentProfileId === profileId ? nextCurrent.name : settings.customDisplayName,
      customAvatar: settings.currentProfileId === profileId ? nextCurrent.avatar : settings.customAvatar,
    };

    onSaveSettings(newSettings);
    onShowToast('info', `Profile "${profileName}" was removed.`, 'Profile Deleted');
  };

  // PIN Setup / Save
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    if (pinStep === 'create') {
      if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
        setPinError('PIN must be exactly 4 numeric digits.');
        return;
      }
      if (pinInput !== pinConfirmInput) {
        setPinError('PINs do not match. Please re-enter.');
        return;
      }

      const newSettings: UserSettings = {
        ...settings,
        profilePin: pinInput,
        profilePinEnabled: true,
      };
      onSaveSettings(newSettings);
      setIsPinModalOpen(false);
      setPinInput('');
      setPinConfirmInput('');
      onShowToast('success', 'Profile PIN has been activated!', 'PIN Enabled');
    } else if (pinStep === 'remove') {
      if (pinInput !== settings.profilePin) {
        setPinError('Incorrect PIN. Please enter your current 4-digit PIN.');
        return;
      }

      const newSettings: UserSettings = {
        ...settings,
        profilePin: null,
        profilePinEnabled: false,
      };
      onSaveSettings(newSettings);
      setIsPinModalOpen(false);
      setPinInput('');
      onShowToast('info', 'Profile PIN has been removed.', 'PIN Disabled');
    }
  };

  // Connect AniList Access Token for 2-Way Live Sync
  const handleConnectAniListToken = async (tokenToUse?: string) => {
    const token = (tokenToUse || anilistTokenInput).trim();
    if (!token) {
      onShowToast('error', 'Please paste a valid AniList OAuth Access Token.', 'Token Required');
      return;
    }

    setIsSyncingAniList(true);
    try {
      // 1. Fetch authenticated viewer
      const viewer = await fetchViewerProfile(token);
      if (!viewer || !viewer.name) {
        throw new Error('Could not retrieve AniList profile with this token.');
      }

      // 2. Fetch user's media list
      const items = await fetchUserMediaList(viewer.name);
      if (items && items.length > 0) {
        onImportList(items, viewer.name);
      }

      // 3. Save to settings with Two-Way Sync Active
      const updated: UserSettings = {
        ...settings,
        anilistToken: token,
        importUsername: viewer.name,
        anilistUser: viewer,
        twoWaySyncEnabled: true,
        syncWatchStatus: true,
        syncEpisodeProgress: true,
        syncScores: true,
        lastSyncTimestamp: Date.now(),
      };

      onSaveSettings(updated);
      setShowTokenInput(false);
      onShowToast(
        'success',
        `Live Two-Way Sync enabled for "${viewer.name}"! Changes made here will update your AniList profile.`,
        'Two-Way Live Sync Active'
      );
    } catch (err: any) {
      console.error('AniList Token Connection Error:', err);
      onShowToast('error', err.message || 'Invalid AniList token. Please verify and retry.', 'Token Invalid');
    } finally {
      setIsSyncingAniList(false);
    }
  };

  // One-Click AniList Username Sync (Public Watchlist Import)
  const handleSyncAniListUsername = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const username = anilistUsernameInput.trim();
    if (!username) {
      onShowToast('error', 'Please enter your AniList username.', 'Username Required');
      return;
    }

    setIsSyncingAniList(true);
    try {
      // 1. Fetch user watchlist
      const items = await fetchUserMediaList(username);
      if (!items || items.length === 0) {
        onShowToast('info', `No anime records found under AniList username "${username}".`, 'List Empty');
        setIsSyncingAniList(false);
        return;
      }

      // 2. Fetch user profile stats & avatar
      let aniUser = null;
      try {
        aniUser = await fetchAniListUserProfile(username);
      } catch (profileErr) {
        console.warn('Could not fetch AniList user profile metadata:', profileErr);
      }

      // 3. Save to library & settings (Username-only is 1-way sync)
      onImportList(items, username);
      const updated: UserSettings = {
        ...settings,
        importUsername: username,
        anilistUser: aniUser || {
          id: 0,
          name: username,
          avatar: { large: PRESET_AVATARS[0].url },
        },
        lastSyncTimestamp: Date.now(),
      };

      onSaveSettings(updated);
      onShowToast(
        'sync',
        `Successfully synced ${items.length} anime entries from "${username}"!`,
        'AniList Synced'
      );
    } catch (err: any) {
      console.error('AniList Sync Error:', err);
      onShowToast('error', err.message || 'Failed to sync with AniList. Check username spelling.', 'Sync Failed');
    } finally {
      setIsSyncingAniList(false);
    }
  };

  // Disconnect AniList
  const handleDisconnectAniList = () => {
    onSaveSettings({
      ...settings,
      importUsername: null,
      anilistToken: null,
      anilistUser: null,
      twoWaySyncEnabled: false,
      lastSyncTimestamp: null,
    });
    setAnilistUsernameInput('');
    setAnilistTokenInput('');
    onShowToast('info', 'AniList account disconnected.', 'Disconnected');
  };

  // Force Cloud Resync with Firebase Firestore
  const handleForceCloudResync = async () => {
    if (!currentUser) {
      onShowToast('info', 'Sign in with Google to enable Firebase cross-device cloud sync.', 'Sign In Required');
      return;
    }
    setIsCloudResyncing(true);
    try {
      await syncUserProfileToCloud(currentUser, settings, libraryCount);
      onShowToast(
        'success',
        'Your watch history, library, and settings are fully synchronized with Firebase across all your devices.',
        'Cloud Resynced'
      );
    } catch (err: any) {
      console.error('Cloud resync error:', err);
      onShowToast('error', 'Could not resync with Firebase cloud.', 'Sync Error');
    } finally {
      setIsCloudResyncing(false);
    }
  };

  // Toggle Content Restrictions (18+ / Mature filter)
  const handleToggleContentRestrictions = () => {
    const updatedVal = !settings.contentRestrictions;
    onSaveSettings({
      ...settings,
      contentRestrictions: updatedVal,
    });
    onShowToast(
      updatedVal ? 'info' : 'success',
      updatedVal
        ? 'Content Restrictions turned ON: 18+ and adult content will be filtered.'
        : 'Content Restrictions turned OFF: All anime content visible.',
      'Content Filter'
    );
  };

  const displayName = currentProfile.name || settings.customDisplayName || currentUser?.displayName || 'Anime Explorer';
  const email = currentProfile.email || settings.customEmail || currentUser?.email || 'Guest User';
  const avatarUrl = currentProfile.avatar || settings.customAvatar || currentUser?.photoURL || PRESET_AVATARS[0].url;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* PROFILE HEADER CARD */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-b from-pink-950/40 via-slate-900/90 to-slate-900/90 border border-white/15 backdrop-blur-2xl shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          {/* Avatar Circle with Neon Ring & Edit Pencil */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-violet-600 p-1 shadow-xl shadow-pink-500/30">
              <div className="w-full h-full rounded-full bg-slate-950 overflow-hidden flex items-center justify-center relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600 to-violet-800 text-white text-3xl font-black">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Click to Edit Avatar / Profile */}
            <button
              onClick={() => {
                setEditName(displayName);
                setEditAvatar(avatarUrl);
                setIsEditProfileOpen(true);
              }}
              className="absolute bottom-0 right-0 p-2.5 rounded-full bg-pink-500 text-white shadow-lg border-2 border-slate-900 cursor-pointer hover:bg-pink-600 transition active:scale-95"
              title="Change Name or Avatar"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          {/* User Display Info */}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{displayName}</span>
              {currentUser && (
                <CheckCircle2 className="w-5 h-5 text-pink-400" title="Google Account Verified" />
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
              {email}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setEditName(displayName);
                setEditAvatar(avatarUrl);
                setIsEditProfileOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-md"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setIsSwitchProfileOpen(true)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-md"
            >
              <User className="w-3.5 h-3.5 text-violet-400" />
              <span>Switch Profile</span>
            </button>

            {currentUser ? (
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <LogOut className="w-3.5 h-3.5 text-pink-400" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  disabled={isAuthLoading}
                  onClick={handleGoogleSignIn}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white text-xs font-extrabold shadow-lg shadow-pink-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  {isAuthLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5" />
                  )}
                  <span>Sign In with Google</span>
                </button>
                <button
                  onClick={() => handleActivateDemoAccount()}
                  className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 hover:text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer backdrop-blur-md"
                  title="Activate Instant Demo Profile"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Demo Profile</span>
                </button>
              </div>
            )}

            <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 backdrop-blur-md flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-pink-400" />
              <span>{libraryCount} in Watchlist</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: ACCOUNT & SECURITY */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-6 space-y-4 shadow-lg">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
          Account & Security
        </h2>

        <div className="divide-y divide-white/5">
          {/* Switch Profile Row */}
          <div
            onClick={() => setIsSwitchProfileOpen(true)}
            className="py-3.5 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 text-pink-300 group-hover:bg-pink-500/20 transition">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white group-hover:text-pink-300 transition">Switch Profile</p>
                <p className="text-xs text-slate-400">Manage multiple profiles or create a guest profile</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-semibold">{displayName}</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 transition" />
            </div>
          </div>

          {/* Profile PIN Row */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 text-pink-300">
                {settings.profilePinEnabled ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Profile PIN Lock</p>
                <p className="text-xs text-slate-400">
                  {settings.profilePinEnabled
                    ? 'Protected with 4-digit PIN'
                    : 'Require 4-digit PIN for account and library access'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {settings.profilePinEnabled ? (
                <button
                  onClick={() => {
                    setPinStep('remove');
                    setPinInput('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  }}
                  className="text-xs font-bold text-pink-400 hover:text-pink-300 underline cursor-pointer"
                >
                  Change / Remove
                </button>
              ) : (
                <button
                  onClick={() => {
                    setPinStep('create');
                    setPinInput('');
                    setPinConfirmInput('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 text-xs font-bold transition cursor-pointer"
                >
                  Set PIN
                </button>
              )}

              <button
                onClick={() => {
                  if (settings.profilePinEnabled) {
                    setPinStep('remove');
                    setPinInput('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  } else {
                    setPinStep('create');
                    setPinInput('');
                    setPinConfirmInput('');
                    setPinError('');
                    setIsPinModalOpen(true);
                  }
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.profilePinEnabled ? 'bg-pink-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.profilePinEnabled ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: VIEWING PREFERENCES & CONTENT RESTRICTIONS */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-6 space-y-4 shadow-lg">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
          Viewing Preferences
        </h2>

        <div className="divide-y divide-white/5">
          {/* Content Restrictions (ON/OFF Toggle, default OFF) */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 text-pink-300">
                {settings.contentRestrictions ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">Content Restrictions</p>
                <p className="text-xs text-slate-400">
                  {settings.contentRestrictions
                    ? 'Filtering active: Mature & 18+ content hidden'
                    : 'Restrictions OFF: Showing all anime including mature content'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                  settings.contentRestrictions
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-white/5 text-slate-400 border-white/10'
                }`}
              >
                {settings.contentRestrictions ? 'Active' : 'Off'}
              </span>

              <button
                onClick={handleToggleContentRestrictions}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.contentRestrictions ? 'bg-pink-500' : 'bg-white/10'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    settings.contentRestrictions ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Audio Language */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 text-pink-300">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Audio Language</p>
                <p className="text-xs text-slate-400">Default audio stream preference</p>
              </div>
            </div>
            <select
              value={settings.preferredAudio}
              onChange={e =>
                onSaveSettings({
                  ...settings,
                  preferredAudio: e.target.value as 'sub' | 'dub',
                })
              }
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/15 text-xs font-bold text-slate-200 focus:outline-none focus:border-pink-500 cursor-pointer"
            >
              <option value="sub">Japanese (Sub)</option>
              <option value="dub">English (Dub)</option>
            </select>
          </div>

          {/* Auto-Play Next Episode */}
          <div className="py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-white/5 text-pink-300">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Auto-Play Next Episode</p>
                <p className="text-xs text-slate-400">Seamlessly continue next episode when current completes</p>
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !settings.autoPlayNextEpisode;
                onSaveSettings({ ...settings, autoPlayNextEpisode: nextVal });
                onShowToast('info', `Auto-play ${nextVal ? 'enabled' : 'disabled'}.`);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.autoPlayNextEpisode ? 'bg-pink-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.autoPlayNextEpisode ? 'right-1' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: DATA BACKUP & EXPORT */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-6 space-y-4 shadow-lg">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
          Data Backup & Transfer
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onExportBackup}
            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-pink-400" />
              <div>
                <p className="text-sm font-bold text-white">Export Watchlist JSON</p>
                <p className="text-xs text-slate-400">Download offline backup file</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          <label className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-violet-400" />
              <div>
                <p className="text-sm font-bold text-white">Import Backup File</p>
                <p className="text-xs text-slate-400">Restore library from JSON</p>
              </div>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={onImportBackup}
              className="hidden"
            />
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </label>
        </div>
      </div>

      {/* SECTION 4: ANILIST TWO-WAY LIVE SYNC */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-blue-600/20 text-sky-400 border border-sky-500/30 shadow-md">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">AniList Two-Way Live Sync</h2>
                {settings.twoWaySyncEnabled && settings.anilistToken ? (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    2-Way Live Active
                  </span>
                ) : settings.importUsername ? (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                    1-Way Import
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                    Not Linked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your real AniList account to keep your watch progress, status, and ratings synchronized bidirectionally.
              </p>
            </div>
          </div>
        </div>

        {/* CONNECTED STATE: TWO-WAY LIVE SYNC OR USERNAME */}
        {settings.importUsername || settings.anilistToken ? (
          <div className="space-y-4">
            {/* Account Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {settings.anilistUser?.avatar?.large ? (
                  <img
                    src={settings.anilistUser.avatar.large}
                    alt={settings.importUsername || 'AniList User'}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-sky-500/40 shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-black text-lg">
                    {(settings.importUsername || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-white">{settings.importUsername || settings.anilistUser?.name}</p>
                    <span className="text-[10px] font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                      AniList Account
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {settings.twoWaySyncEnabled && settings.anilistToken
                      ? 'Live 2-Way Sync Active: Actions on this site automatically push updates to AniList in real-time.'
                      : '1-Way Sync: Public watchlist imported. Link your AniList token to enable live bidirectional synchronization.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  disabled={isSyncingAniList}
                  onClick={() => {
                    if (settings.importUsername) handleSyncAniListUsername();
                    else if (settings.anilistToken) handleConnectAniListToken(settings.anilistToken);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/20 active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAniList ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAniList ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <button
                  onClick={handleDisconnectAniList}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  Unlink
                </button>
              </div>
            </div>

            {/* LIVE TWO-WAY SYNC PREFERENCES (If Token Connected) */}
            {settings.twoWaySyncEnabled && settings.anilistToken ? (
              <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Two-Way Live Sync Automation
                  </span>
                  <span className="text-[11px] text-sky-300 font-semibold">Real-time mutation push</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Sync Watch Status */}
                  <div
                    onClick={() =>
                      onSaveSettings({
                        ...settings,
                        syncWatchStatus: !settings.syncWatchStatus,
                      })
                    }
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      settings.syncWatchStatus
                        ? 'bg-sky-500/15 border-sky-500/40 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Watch Status</p>
                      <p className="text-[10px] text-slate-400">Watching, Completed, Dropped</p>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settings.syncWatchStatus ? 'bg-sky-500 border-sky-400' : 'border-slate-600'}`}>
                      {settings.syncWatchStatus && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  </div>

                  {/* Sync Episode Progress */}
                  <div
                    onClick={() =>
                      onSaveSettings({
                        ...settings,
                        syncEpisodeProgress: !settings.syncEpisodeProgress,
                      })
                    }
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      settings.syncEpisodeProgress
                        ? 'bg-sky-500/15 border-sky-500/40 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Episode Progress</p>
                      <p className="text-[10px] text-slate-400">Updates live when watching</p>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settings.syncEpisodeProgress ? 'bg-sky-500 border-sky-400' : 'border-slate-600'}`}>
                      {settings.syncEpisodeProgress && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  </div>

                  {/* Sync Scores */}
                  <div
                    onClick={() =>
                      onSaveSettings({
                        ...settings,
                        syncScores: !settings.syncScores,
                      })
                    }
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      settings.syncScores
                        ? 'bg-sky-500/15 border-sky-500/40 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold">Ratings & Scores</p>
                      <p className="text-[10px] text-slate-400">Syncs 1-10 scores to AniList</p>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${settings.syncScores ? 'bg-sky-500 border-sky-400' : 'border-slate-600'}`}>
                      {settings.syncScores && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Upgrade to 2-way live sync prompt */
              <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 to-violet-950/40 border border-sky-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Enable Live Two-Way Sync (Web ➔ AniList)
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Authorize or paste your AniList access token so changes made here automatically update your real AniList account in real-time.
                  </p>
                </div>
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold shadow-lg shadow-sky-500/25 transition cursor-pointer whitespace-nowrap active:scale-95"
                >
                  Activate 2-Way Sync
                </button>
              </div>
            )}
          </div>
        ) : (
          /* NOT CONNECTED: SHOW AUTH OPTIONS */
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: 1-Click Public Username Sync */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-black uppercase text-pink-400">Option 1</span>
                    <span className="text-xs font-bold text-white">Public Username Sync (1-Way)</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Quickly import your public watchlist without entering any passwords or tokens.
                  </p>
                </div>

                <form onSubmit={handleSyncAniListUsername} className="space-y-2 pt-2">
                  <input
                    type="text"
                    value={anilistUsernameInput}
                    onChange={e => setAnilistUsernameInput(e.target.value)}
                    placeholder="Enter AniList username..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    disabled={isSyncingAniList}
                    className="w-full py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingAniList ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Import Watchlist</span>
                  </button>
                </form>
              </div>

              {/* Option B: Live 2-Way Sync Token Authorization */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/30 via-slate-900 to-slate-900 border border-sky-500/30 space-y-3 flex flex-col justify-between shadow-lg shadow-sky-500/5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-black uppercase text-sky-400">Option 2 (Recommended)</span>
                    <span className="text-xs font-bold text-white">Live Two-Way Sync</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    No server required! Uses direct browser GraphQL to instantly synchronize episode progress, ratings, and watch status to your AniList profile.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <a
                    href={getAniListAuthUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-extrabold shadow-lg shadow-sky-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>1-Click Authorize with AniList</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShowTokenInput(!showTokenInput)}
                    className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-bold transition text-center cursor-pointer"
                  >
                    {showTokenInput ? 'Hide Token Input' : 'Or Paste AniList Access Token'}
                  </button>
                </div>
              </div>
            </div>

            {/* Token Input Drawer */}
            {showTokenInput && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-sky-300">
                    Paste AniList OAuth Access Token
                  </label>
                  <a
                    href="https://anilist.co/settings/developer"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                  >
                    Get token from AniList Developer Settings &rarr;
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={anilistTokenInput}
                    onChange={e => setAnilistTokenInput(e.target.value)}
                    placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => handleConnectAniListToken()}
                    disabled={isSyncingAniList}
                    className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                  >
                    {isSyncingAniList ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 5 (AT THE VERY BOTTOM): FIREBASE AUTOMATIC CROSS-DEVICE CLOUD SYNC */}
      <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl p-6 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-pink-500/20 text-violet-400 border border-violet-500/30 shadow-md">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight">Firebase Cloud Synchronization</h2>
                {currentUser ? (
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Synced (Live)
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Local Device Only
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentUser
                  ? 'Continuous background synchronization active across your phone, tablet, and PC. Every episode watched, library item added, or setting modified is saved to Firebase Cloud automatically with zero manual effort.'
                  : 'Sign in with your Google account to automatically sync your watch progress and library across all devices in real-time.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {!currentUser && (
              <button
                disabled={isAuthLoading}
                onClick={handleGoogleSignIn}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white text-xs font-extrabold transition cursor-pointer shadow-md active:scale-95"
              >
                {isAuthLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Sign In with Google'}
              </button>
            )}
          </div>
        </div>

        {/* Sync features overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-pink-400">
              <Radio className="w-4 h-4" />
              <p className="text-xs font-bold text-white">Live Watch History & Resume</p>
            </div>
            <p className="text-[11px] text-slate-400">
              Playback positions and episode completions are instantly mirrored to Firestore so you can pick up exactly where you left off on any screen.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-violet-400">
              <Database className="w-4 h-4" />
              <p className="text-xs font-bold text-white">Watchlist & Ratings</p>
            </div>
            <p className="text-[11px] text-slate-400">
              Anime additions, status classifications (Watching, Completed, Dropped), and scores automatically sync seamlessly.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <div className="flex items-center gap-2 text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              <p className="text-xs font-bold text-white">Master Account Security</p>
            </div>
            <p className="text-[11px] text-slate-400">
              Locked to your authenticated account ({email}) for cross-device authentication and identity preservation.
            </p>
          </div>
        </div>
      </div>

      {/* MODAL 1: EDIT PROFILE (Name, Gmail, Logo/Avatar) */}
      <AnimatePresence>
        {isEditProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Edit Profile Details</h3>
                    <p className="text-xs text-slate-400">Customize your display name, email, and avatar</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditProfileOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Choose Profile Logo / Avatar
                  </label>

                  {/* Preset Avatars Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-3">
                    {PRESET_AVATARS.map((av, idx) => {
                      const isSelected = editAvatar === av.url && !customAvatarInput;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setEditAvatar(av.url);
                            setCustomAvatarInput('');
                          }}
                          className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition cursor-pointer ${
                            isSelected
                              ? 'border-pink-500 ring-2 ring-pink-500/50 scale-105'
                              : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Avatar URL or File Upload */}
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={customAvatarInput}
                      onChange={e => {
                        setCustomAvatarInput(e.target.value);
                        if (e.target.value) setEditAvatar(e.target.value);
                      }}
                      placeholder="Or paste custom image URL..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />

                    <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 cursor-pointer transition">
                      <ImageIcon className="w-4 h-4 text-pink-400" />
                      <span>Upload Avatar File from Device</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = uploadEvt => {
                              const result = uploadEvt.target?.result as string;
                              if (result) {
                                setEditAvatar(result);
                                setCustomAvatarInput(result);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* Email / Gmail (Locked to Firebase Master Account) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Master Account Email
                    </label>
                    <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Locked & Cloud-Verified
                    </span>
                  </div>
                  <div className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-sm text-slate-300 flex items-center justify-between">
                    <span className="font-mono">{email}</span>
                    <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Firebase Primary
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Account email is locked to your authenticated Google / Firebase identity for secure cross-device synchronization and cannot be altered.
                  </p>
                </div>

                {/* Save Button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditProfileOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white text-xs font-extrabold shadow-lg shadow-pink-500/25 transition cursor-pointer active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: SWITCH PROFILE */}
      <AnimatePresence>
        {isSwitchProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Switch Profile</h3>
                    <p className="text-xs text-slate-400">Select an account profile or add a new one</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSwitchProfileOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profiles List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {profiles.map(prof => {
                  const isActive = prof.id === currentProfile.id;
                  return (
                    <div
                      key={prof.id}
                      onClick={() => handleSwitchProfile(prof)}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-pink-500/20 border-pink-500/50 shadow-md shadow-pink-500/10'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={prof.avatar}
                          alt={prof.name}
                          className="w-10 h-10 rounded-full object-cover border border-white/20"
                        />
                        <div>
                          <p className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{prof.name}</span>
                            {isActive && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-500 text-white">
                                Active
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{prof.email || 'Local User'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {profiles.length > 1 && !isActive && (
                          <button
                            onClick={e => handleDeleteProfile(prof.id, prof.name, e)}
                            className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                            title="Delete Profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {isActive && <Check className="w-5 h-5 text-pink-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add New Profile Button */}
              <div className="pt-2">
                <button
                  onClick={() => setIsNewProfileModalOpen(true)}
                  className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-pink-500 text-slate-300 hover:text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-pink-400" />
                  <span>Create New Profile</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: CREATE NEW PROFILE */}
      <AnimatePresence>
        {isNewProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Create New Profile</h3>
                <button
                  onClick={() => setIsNewProfileModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateNewProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    Pick Profile Avatar
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AVATARS.slice(0, 6).map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewProfileAvatar(av.url)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                          newProfileAvatar === av.url ? 'border-pink-500 scale-105' : 'border-white/10 opacity-70'
                        }`}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                    placeholder="e.g. Otaku Night Mode, Guest..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNewProfileModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-bold cursor-pointer active:scale-95"
                  >
                    Create Profile
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: PROFILE PIN SETUP / REMOVE */}
      <AnimatePresence>
        {isPinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      {pinStep === 'create' ? 'Set Profile 4-Digit PIN' : 'Verify & Remove PIN'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {pinStep === 'create'
                        ? 'Protect your library with a 4-digit code'
                        : 'Enter your current PIN to turn off lock'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPinModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePin} className="space-y-4">
                {pinError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                    {pinError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    {pinStep === 'create' ? 'Enter 4-Digit PIN' : 'Current 4-Digit PIN'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/15 text-center text-2xl tracking-widest text-pink-400 font-black focus:outline-none focus:border-pink-500"
                  />
                </div>

                {pinStep === 'create' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Confirm 4-Digit PIN
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={pinConfirmInput}
                      onChange={e => setPinConfirmInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-white/15 text-center text-2xl tracking-widest text-pink-400 font-black focus:outline-none focus:border-pink-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 text-white text-xs font-bold cursor-pointer active:scale-95 shadow-lg shadow-pink-500/25"
                  >
                    {pinStep === 'create' ? 'Activate PIN' : 'Confirm & Disable'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* MODAL 5: FIREBASE DOMAIN AUTHORIZATION GUIDANCE */}
      <AnimatePresence>
        {authDomainError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-slate-900 border border-pink-500/30 p-6 space-y-5 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      Firebase Domain Authorization Required
                    </h3>
                    <p className="text-xs text-slate-400">
                      Firebase OAuth popups require this preview domain to be in the Authorized Domains list.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAuthDomainError(null)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Domain Box with Copy */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-bold uppercase tracking-wider text-pink-400">Your Current App Domain</span>
                  {copiedDomain && <span className="text-emerald-400 font-bold">Copied to clipboard!</span>}
                </div>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-white/10">
                  <code className="text-xs text-pink-300 font-mono break-all select-all">
                    {authDomainError.domain}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(authDomainError.domain);
                      setCopiedDomain(true);
                      setTimeout(() => setCopiedDomain(false), 2500);
                      onShowToast('info', `Copied "${authDomainError.domain}" to clipboard.`, 'Domain Copied');
                    }}
                    className="p-2 rounded-lg bg-white/10 hover:bg-pink-500/20 text-slate-300 hover:text-pink-300 transition flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* Step-by-step instructions */}
              <div className="space-y-2 text-xs text-slate-300">
                <p className="font-bold text-white uppercase tracking-wider text-[11px]">How to Authorize:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                  <li>
                    Open Firebase Console:{' '}
                    <a
                      href={authDomainError.consoleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 hover:text-pink-300 underline font-semibold inline-flex items-center gap-1"
                    >
                      Authentication Settings <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>Go to the <strong className="text-white">Authorized domains</strong> tab.</li>
                  <li>Click <strong className="text-white">Add domain</strong>, paste <code className="text-pink-300 bg-white/5 px-1 py-0.5 rounded font-mono">{authDomainError.domain}</code>, and click Save.</li>
                </ol>
              </div>

              {/* Actions: Demo Profile or Close */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleActivateDemoAccount('Kurogane Otaku', 'otaku.explorer@anilove.app')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-pink-500/25 active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Continue with Demo Cloud Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthDomainError(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
