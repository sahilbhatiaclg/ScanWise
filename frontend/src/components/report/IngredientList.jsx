import React, { useState, useMemo } from 'react';
import { getRatingConfig } from '../../lib/ratingStyles';
import { ChevronDown, ChevronUp, AlertCircle, Sparkles, Filter } from 'lucide-react';

export function IngredientList({ ingredients = [] }) {
  const [activeFilter, setActiveFilter] = useState('all'); // all | risk | adjustable | safe
  const [expandedId, setExpandedId] = useState(null);

  // Sort ingredients: Risk (severity 3) first, then Adjustable (2), then Safe (1)
  const sorted = useMemo(() => {
    return [...ingredients].sort((a, b) => {
      const sevA = a.severity || 1;
      const sevB = b.severity || 1;
      return sevB - sevA;
    });
  }, [ingredients]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return sorted;
    return sorted.filter((item) => (item.rating || '').toLowerCase() === activeFilter);
  }, [sorted, activeFilter]);

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const filterButtons = [
    { id: 'all', label: `All (${ingredients.length})` },
    { id: 'risk', label: `Risk (${ingredients.filter((i) => i.rating === 'risk').length})` },
    { id: 'adjustable', label: `Adjustable (${ingredients.filter((i) => i.rating === 'adjustable').length})` },
    { id: 'safe', label: `Safe (${ingredients.filter((i) => i.rating === 'safe').length})` },
  ];

  return (
    <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Ingredient Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tap an ingredient to inspect functional role and contraindications
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {filterButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setActiveFilter(btn.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                activeFilter === btn.id
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 py-6 text-center">No ingredients matching filter</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {filtered.map((item, idx) => {
            const config = getRatingConfig(item.rating);
            const Icon = config.icon;
            const itemId = item.ingredient_id ?? idx;
            const isExpanded = expandedId === itemId;

            return (
              <div key={itemId} className="py-3 transition-colors">
                {/* Header Row */}
                <div
                  onClick={() => toggleExpand(itemId)}
                  className="flex items-start justify-between gap-3 cursor-pointer select-none group"
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="mt-0.5 shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-dark transition-colors">
                        {item.name}
                      </p>
                      {item.category && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rating Badge with explicit Icon + Text */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 border ${config.badgeClass}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {config.label}
                  </span>
                </div>

                {/* Collapsible Detail Panel */}
                {isExpanded && (
                  <div className="mt-3 ml-6 pl-3 border-l-2 border-slate-200 dark:border-slate-800 space-y-2 text-xs animate-fadeIn">
                    {item.reason && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                          Personalization note:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                          {item.reason}
                        </p>
                      </div>
                    )}
                    {item.uses && (
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-0.5">
                          Functional Role:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.uses}
                        </p>
                      </div>
                    )}
                    {item.disadvantages && (
                      <div>
                        <span className="font-semibold text-rose-700 dark:text-rose-400 block mb-0.5">
                          Health Considerations:
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.disadvantages}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

