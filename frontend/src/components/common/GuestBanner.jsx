import React, { useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function GuestBanner({ onLoginClick }) {
  const { isGuest } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isGuest || dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-accent-50 dark:bg-amber-950/40 border-b border-accent-100 dark:border-amber-900/50 px-4 py-2.5 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <Sparkles className="w-4 h-4 text-accent shrink-0" />
          <span>
            <strong className="font-semibold">Guest Session:</strong> Scans are not saved to history. Sign in with mobile OTP to keep your health logs.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onLoginClick && (
            <button
              onClick={onLoginClick}
              className="inline-flex items-center gap-1 font-semibold text-accent hover:underline dark:text-amber-300"
            >
              Sign In <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

