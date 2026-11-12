import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function ConsentNotice({ className = '' }) {
  return (
    <div
      className={`rounded-card border border-slate-200 dark:border-surface-dark-border bg-slate-50/70 dark:bg-surface-dark-card/50 p-3.5 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5 ${className}`}
    >
      <ShieldCheck className="w-4 h-4 text-brand dark:text-brand-dark shrink-0 mt-0.5" />
      <p className="leading-relaxed">
        <strong>Privacy Commitment (DPDP Compliant):</strong> Uploaded label photos are analyzed in volatile memory to extract ingredients and immediately discarded. Images are never stored on disk or persistent cloud buckets.
      </p>
    </div>
  );
}

