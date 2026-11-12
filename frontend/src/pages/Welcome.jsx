import React, { useState } from 'react';
import { Leaf, Sparkles, ShieldCheck, ArrowRight, Smartphone, Zap, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export function Welcome({ onNavigate }) {
  const { continueAsGuest } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGuest = async () => {
    setIsGuestLoading(true);
    setError(null);
    try {
      await continueAsGuest();
      if (onNavigate) {
        onNavigate('home');
      }
    } catch (err) {
      console.error('Guest start failed', err);
      setError('Could not start guest session. Please try again.');
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-md mx-auto px-5 py-8">
      {/* Top Header with Theme Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-700 dark:bg-brand-dark flex items-center justify-center text-white dark:text-slate-950 shadow-sm">
            <Leaf className="w-4 h-4 stroke-[2.4]" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">ScanWise</span>
        </div>

        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="w-9 h-9 rounded-lg border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card flex items-center justify-center text-slate-600 dark:text-slate-300"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Hero Visual & Copy */}
      <div className="my-auto py-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-emerald-950/60 border border-brand-200 dark:border-brand-800/80 mx-auto flex items-center justify-center text-brand-700 dark:text-brand-dark mb-5 shadow-sm">
          <Zap className="w-8 h-8 stroke-[2]" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
          Instant Back-Label <br />
          <span className="text-brand-700 dark:text-brand-dark">Health Intelligence</span>
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 max-w-xs mx-auto leading-relaxed">
          Snap any food, beverage, or skincare ingredient list. Get clear verdicts, allergen alerts, and safe portion limits tailored to your body.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-2.5 mt-6 text-left text-xs">
          <div className="p-3 rounded-card bg-surface-light-card dark:bg-surface-dark-card border border-slate-200 dark:border-surface-dark-border">
            <ShieldCheck className="w-4 h-4 text-brand dark:text-brand-dark mb-1" />
            <strong className="block text-slate-900 dark:text-slate-100 font-semibold">100% Deterministic</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Strict medical & regulatory rules</span>
          </div>
          <div className="p-3 rounded-card bg-surface-light-card dark:bg-surface-dark-card border border-slate-200 dark:border-surface-dark-border">
            <Sparkles className="w-4 h-4 text-accent dark:text-amber-300 mb-1" />
            <strong className="block text-slate-900 dark:text-slate-100 font-semibold">Portion Guidance</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Daily limits for your age group</span>
          </div>
        </div>
      </div>

      {/* Action CTAs */}
      <div className="space-y-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={Smartphone}
          onClick={() => onNavigate('login')}
          className="shadow-md"
        >
          Sign In with Mobile OTP
        </Button>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          icon={ArrowRight}
          isLoading={isGuestLoading}
          onClick={handleGuest}
        >
          Continue as Guest
        </Button>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 pt-2">
          By continuing, you agree to secure ephemeral OCR image processing.
        </p>
      </div>
    </div>
  );
}
