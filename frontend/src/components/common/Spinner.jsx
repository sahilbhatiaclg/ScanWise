import React from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', label = '', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 ${className}`}>
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin text-brand dark:text-brand-dark`} />
      {label && <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>}
    </div>
  );
}

