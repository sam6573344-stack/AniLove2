import React from 'react';
import { Home, Search, Gamepad2, Calendar, Bookmark, User } from 'lucide-react';
import { UserSettings } from '../types';
import { TabType } from './Navbar';

interface MobileBottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  settings: UserSettings;
  libraryCount: number;
  onOpenAiSensei?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  settings,
  libraryCount,
  onOpenAiSensei,
}) => {
  const isTwoWayConnected = Boolean(settings.twoWaySyncEnabled && settings.anilistToken);

  const navItems: { id: TabType; label: string; icon: any; badge?: number | boolean }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Search', icon: Search },
    { id: 'arcade', label: 'Arcade', icon: Gamepad2 },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'library', label: 'Library', icon: Bookmark, badge: libraryCount },
    { id: 'account', label: 'Account', icon: User, badge: isTwoWayConnected },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 px-1 sm:px-4 pt-1.5 pb-[max(env(safe-area-inset-bottom,8px),8px)] shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[48px] sm:min-w-[56px] min-h-[44px] py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'text-pink-400 font-bold bg-white/10 shadow-inner shadow-pink-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.id === 'library' && typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[14px] text-center rounded-full bg-pink-500 text-white text-[8px] font-black leading-tight shadow">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
                {item.id === 'account' && Boolean(item.badge) && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900 shadow-sm" />
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] leading-tight tracking-tight mt-0.5">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-3 h-0.5 rounded-full bg-pink-400" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
