import React from 'react';
import { Sun, Moon, Shield, Sparkles, Camera, Clock, User, Home, Leaf } from 'lucide-react';
import { useViewport } from '../../hooks/useViewport';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { BottomNav } from './BottomNav';
import { GuestBanner } from '../common/GuestBanner';

export function AppShell({ activeTab = 'home', onTabChange, onLoginClick, children }) {
  const { isMobile } = useViewport();
  const { theme, toggleTheme } = useTheme();
  const { isGuest, isRegisteredUser, isAuthenticated } = useAuth();

  const desktopNavItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'scan', label: 'New Scan', icon: Camera },
    { id: 'history', label: 'History', icon: Clock, disabled: isGuest },
    { id: 'profile', label: 'Health Profile', icon: User },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-surface-light dark:bg-surface-dark transition-colors duration-150">
      {/* Top Header */}
      <header className="sticky top-0 z-30 h-14 bg-surface-light-card/90 dark:bg-surface-dark-card/90 backdrop-blur-md border-b border-slate-200 dark:border-surface-dark-border px-4 transition-colors">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div
            onClick={() => onTabChange && onTabChange('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-[8px] bg-brand-700 dark:bg-brand-dark flex items-center justify-center text-white dark:text-slate-950 shadow-sm transition-transform group-hover:scale-105">
              <Leaf className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                ScanWise
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full uppercase tracking-wider bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-dark border border-brand-200 dark:border-brand-800/60">
                  v2
                </span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          {!isMobile && isAuthenticated && (
            <nav className="flex items-center gap-1">
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    disabled={item.disabled}
                    onClick={() => onTabChange && onTabChange(item.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-dark border border-brand-200 dark:border-brand-800/60'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-surface-dark-card'
                    } ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Header Controls (Role badge + Theme Toggle) */}
          <div className="flex items-center gap-2">
            {/* Role indicator */}
            {isGuest && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <Sparkles className="w-3 h-3 text-accent" />
                Guest
              </span>
            )}
            {isRegisteredUser && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <Shield className="w-3 h-3 text-brand" />
                Verified
              </span>
            )}

            {/* Accessible Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-surface-dark-border bg-slate-50 dark:bg-surface-dark-card text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 stroke-[2]" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Guest Mode Sticky Banner */}
      <GuestBanner onLoginClick={onLoginClick} />

      {/* Main Content Area */}
      <main className={`flex-1 w-full max-w-6xl mx-auto px-4 py-4 md:py-6 ${isMobile ? 'pb-24' : 'pb-10'}`}>
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && isAuthenticated && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );
}

