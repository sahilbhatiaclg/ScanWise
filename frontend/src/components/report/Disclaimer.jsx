import React from 'react';
import { AlertCircle } from 'lucide-react';

export function Disclaimer({ className = '' }) {
  return (
    <div
      className={`rounded-card border border-slate-200 dark:border-surface-dark-border bg-slate-50/60 dark:bg-surface-dark-card/40 p-4 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2.5 ${className}`}
    >
      <AlertCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong>Medical Disclaimer:</strong> ScanWise provides educational insights by synthesizing public regulatory standards and deterministic allergen matching. It is not a clinical diagnostic tool or a substitute for professional medical, nutritional, or dermatological advice.
      </p>
    </div>
  );
}

