import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { RATING_THEME } from '../../lib/ratingStyles';
import { useTheme } from '../../hooks/useTheme';

export function RatingPieChart({ breakdown, ingredients = [] }) {
  const { isDark } = useTheme();

  // Compute breakdown from props or raw ingredients
  let safeCount = breakdown?.safe_count ?? 0;
  let adjCount = breakdown?.adjustable_count ?? 0;
  let riskCount = breakdown?.risk_count ?? 0;

  if (!breakdown && ingredients.length > 0) {
    safeCount = ingredients.filter((i) => (i.rating || '').toLowerCase() === 'safe').length;
    adjCount = ingredients.filter((i) => (i.rating || '').toLowerCase() === 'adjustable').length;
    riskCount = ingredients.filter((i) => (i.rating || '').toLowerCase() === 'risk').length;
  }

  const data = [
    { name: 'Safe', value: safeCount, color: isDark ? RATING_THEME.safe.colorHexDark : RATING_THEME.safe.colorHexLight },
    { name: 'Adjustable', value: adjCount, color: isDark ? RATING_THEME.adjustable.colorHexDark : RATING_THEME.adjustable.colorHexLight },
    { name: 'Risk Alert', value: riskCount, color: isDark ? RATING_THEME.risk.colorHexDark : RATING_THEME.risk.colorHexLight },
  ].filter((item) => item.value > 0);

  const total = safeCount + adjCount + riskCount;

  return (
    <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Ingredient Safety Breakdown
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Categorized by severity and potential contraindications
      </p>

      <div className="h-48 w-full relative flex items-center justify-center">
        {total === 0 ? (
          <p className="text-xs text-slate-400">No ingredient ratings available</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0];
                    const pct = Math.round((item.value / total) * 100);
                    return (
                      <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md">
                        {item.name}: {item.value} ({pct}%)
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Accessible Legend with Numbers and Colors */}
      <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Safe</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{safeCount}</span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Adjustable</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{adjCount}</span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Risk</span>
          </div>
          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{riskCount}</span>
        </div>
      </div>
    </div>
  );
}

