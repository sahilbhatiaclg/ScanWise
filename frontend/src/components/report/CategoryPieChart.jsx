import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

export function CategoryPieChart({ breakdown, ingredients = [] }) {
  let categories = breakdown?.categories || [];

  if (categories.length === 0 && ingredients.length > 0) {
    const counts = {};
    ingredients.forEach((i) => {
      const cat = i.category || 'Other / Additives';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    categories = Object.entries(counts).map(([category, count]) => ({ category, count }));
  }

  // Predefined harmonious palette
  const PALETTE = ['#0D9488', '#0284C7', '#6366F1', '#8B5CF6', '#EC4899', '#F97316', '#64748B'];

  const data = categories.map((item, idx) => ({
    name: item.category,
    value: item.count,
    color: PALETTE[idx % PALETTE.length],
  }));

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        Functional Categories
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
        Distribution of active components and additives
      </p>

      <div className="h-48 w-full relative flex items-center justify-center">
        {total === 0 ? (
          <p className="text-xs text-slate-400">No categories recorded</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cat-cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0];
                    return (
                      <div className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md">
                        {item.name}: {item.value} items
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

      <div className="flex flex-wrap items-center justify-center gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        {data.slice(0, 4).map((item) => (
          <div key={item.name} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="truncate max-w-[110px]">{item.name}</span>
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

