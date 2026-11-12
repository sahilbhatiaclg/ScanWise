import React from 'react';
import { getVerdictConfig } from '../../lib/ratingStyles';
import { Calendar, Tag } from 'lucide-react';

export function VerdictCard({ report }) {
  if (!report) return null;

  const { verdict, overall_score, product_name, product_type, summary_reason, created_at } = report;
  const config = getVerdictConfig(verdict);
  const Icon = config.icon;

  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recent Scan';

  return (
    <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 md:p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Product Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {product_type || 'Packaged Product'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {product_name || 'Scanned Label'}
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {summary_reason || 'Ingredient review completed based on your personalized profile.'}
          </p>
        </div>

        {/* Verdict Badge & Score Ring */}
        <div className="flex items-center gap-4 shrink-0 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
              {overall_score}
              <span className="text-xs text-slate-400 font-normal ml-0.5">/100</span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Health Score
            </span>
          </div>

          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-800" />

          <div className="text-left">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${config.badgeClass}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {config.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

