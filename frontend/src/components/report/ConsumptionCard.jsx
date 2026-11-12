import React from 'react';
import { Utensils, Calendar, AlertCircle, Info, Sparkles } from 'lucide-react';

export function ConsumptionCard({ guidance }) {
  if (!guidance) return null;

  const { max_servings_per_day, days_per_week, limiting_nutrient, guidance_basis } = guidance;
  const isAiEstimate = guidance_basis === 'ai_estimate';

  return (
    <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-50 dark:bg-amber-950/60 text-accent dark:text-amber-300 flex items-center justify-center">
            <Utensils className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Consumption Guidance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recommended consumption ceiling
            </p>
          </div>
        </div>

        {/* Basis Badge */}
        {isAiEstimate ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-3 h-3 text-accent" />
            AI Estimate
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-brand-200 dark:border-emerald-800">
            Nutrient Rule
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-center">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
            Max Servings / Day
          </span>
          <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {max_servings_per_day != null ? `${max_servings_per_day}x` : '—'}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            Portion limit
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-center">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">
            Frequency
          </span>
          <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {days_per_week != null ? `${days_per_week} days` : '—'}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            Per calendar week
          </span>
        </div>
      </div>

      {limiting_nutrient && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-accent shrink-0" />
          <span>
            Primary limiting nutrient: <strong className="font-semibold text-slate-900 dark:text-slate-200 capitalize">{limiting_nutrient}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

