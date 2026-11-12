import React from 'react';
import { CheckCircle2, Loader2, Circle, AlertCircle } from 'lucide-react';

export function ProgressStages({ stage = 'reading_label', customMessage = '' }) {
  const stages = [
    { id: 'compressing', label: 'Preparing Image', desc: 'Resizing to optimal dimensions' },
    { id: 'reading_label', label: 'Reading Back Label', desc: 'Extracting text and nutrition panel' },
    { id: 'checking_ingredients', label: 'Analyzing Ingredients', desc: 'Cross-checking 100+ DB rules and AI' },
    { id: 'building_report', label: 'Personalizing Health Report', desc: 'Applying your conditions, allergens & limits' },
  ];

  const stageOrder = ['compressing', 'reading_label', 'checking_ingredients', 'building_report', 'complete'];
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-6 shadow-sm">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-50 dark:bg-emerald-950/50 text-brand-700 dark:text-brand-dark mb-3">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Analyzing Product Label
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {customMessage || 'Please hold on while ScanWise processes your image in secure volatile memory.'}
        </p>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {stages.map((stg, index) => {
          const isDone = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isPending = currentIndex < index;

          return (
            <div key={stg.id} className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-brand dark:text-brand-dark" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-accent animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrent
                      ? 'text-slate-900 dark:text-slate-100 font-semibold'
                      : isDone
                      ? 'text-slate-700 dark:text-slate-300 line-through opacity-80'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {stg.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{stg.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

