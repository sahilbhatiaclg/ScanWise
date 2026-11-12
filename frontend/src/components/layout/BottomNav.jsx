import React from 'react';
import { Camera, Clock, User, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function BottomNav({ activeTab, onTabChange }) {
  const { isGuest } = useAuth();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'scan', label: 'Scan', icon: Camera, isPrimary: true },
    { id: 'history', label: 'History', icon: Clock, disabled: isGuest },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface-light-card/95 dark:bg-surface-dark-card/95 backdrop-blur-md border-t border-slate-200 dark:border-surface-dark-border px-3 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] transition-colors"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          if (tab.isPrimary) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -top-3 flex flex-col items-center justify-center p-1 group"
                aria-label="Scan Label"
              >
                <div className="w-[52px] h-[52px] rounded-full bg-brand-700 dark:bg-brand-dark text-white dark:text-slate-950 flex items-center justify-center shadow-md active:scale-95 transition-transform group-hover:bg-brand-800">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] font-semibold tracking-tight text-brand-800 dark:text-brand-dark mt-0.5">
                  Scan
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-lg transition-colors select-none ${isActive
                  ? 'text-brand-700 dark:text-brand-dark font-semibold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                } ${tab.disabled ? 'opacity-40 pointer-events-none' : ''}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
              <span className="text-[11px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}