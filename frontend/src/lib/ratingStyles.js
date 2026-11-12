import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, ShieldCheck, HelpCircle } from 'lucide-react';

/**
 * Visual styling tokens for ratings and verdicts
 * Strictly accessible: always pairs colors with icons and explicit text
 */

export const RATING_THEME = {
  safe: {
    label: 'Safe',
    colorHexLight: '#10B981', // emerald-500
    colorHexDark: '#34D399',  // emerald-400
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    ringClass: 'stroke-emerald-500',
    dotClass: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  adjustable: {
    label: 'Adjustable',
    colorHexLight: '#F59E0B', // amber-500
    colorHexDark: '#FBBF24',  // amber-400
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    ringClass: 'stroke-amber-500',
    dotClass: 'bg-amber-500',
    icon: AlertTriangle,
  },
  risk: {
    label: 'Risk Alert',
    colorHexLight: '#EF4444', // red-500
    colorHexDark: '#F87171',  // red-400
    badgeClass: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    ringClass: 'stroke-rose-500',
    dotClass: 'bg-rose-500',
    icon: AlertOctagon,
  },
};

export const VERDICT_THEME = {
  good: {
    label: 'Good For You',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    scoreColor: 'text-emerald-600 dark:text-emerald-400',
    ringStroke: '#10B981',
    icon: ShieldCheck,
  },
  okay: {
    label: 'Okay in Limits',
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    scoreColor: 'text-amber-600 dark:text-amber-400',
    ringStroke: '#F59E0B',
    icon: AlertTriangle,
  },
  avoid: {
    label: 'Better Avoided',
    badgeClass: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    scoreColor: 'text-rose-600 dark:text-rose-400',
    ringStroke: '#EF4444',
    icon: AlertOctagon,
  },
};

export function getRatingConfig(ratingCode) {
  const code = (ratingCode || '').toLowerCase();
  return RATING_THEME[code] || {
    label: ratingCode || 'Unknown',
    colorHexLight: '#9CA3AF',
    colorHexDark: '#6B7280',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    ringClass: 'stroke-slate-400',
    dotClass: 'bg-slate-400',
    icon: HelpCircle,
  };
}

export function getVerdictConfig(verdictCode) {
  const code = (verdictCode || '').toLowerCase();
  return VERDICT_THEME[code] || VERDICT_THEME.okay;
}

