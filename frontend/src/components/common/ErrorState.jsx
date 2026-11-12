import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not complete your request. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`rounded-card border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-5 text-center ${className}`}
    >
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200 mb-1">{title}</h3>
      <p className="text-xs text-rose-700 dark:text-rose-300/80 mb-4 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="border-rose-300 dark:border-rose-800">
          Try Again
        </Button>
      )}
    </div>
  );
}

