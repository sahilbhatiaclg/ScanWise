import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  fullWidth = false,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'relative inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none rounded-[10px]';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-6 py-3.5 gap-2.5 min-h-[50px] font-semibold',
  };

  const variantClasses = {
    primary:
      'bg-brand-700 hover:bg-brand-800 text-white dark:bg-brand-dark dark:hover:bg-emerald-300 dark:text-slate-950 shadow-sm focus-visible:ring-brand-500 focus-visible:ring-offset-surface-light dark:focus-visible:ring-offset-surface-dark',
    secondary:
      'bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-surface-dark-card dark:hover:bg-slate-800/80 dark:text-slate-200 border border-slate-200 dark:border-surface-dark-border focus-visible:ring-slate-400',
    outline:
      'bg-transparent hover:bg-slate-50 text-slate-700 dark:text-slate-200 dark:hover:bg-surface-dark-card border border-slate-300 dark:border-surface-dark-border focus-visible:ring-brand-500',
    accent:
      'bg-accent hover:bg-amber-700 text-white dark:bg-accent-dark dark:hover:bg-amber-300 dark:text-slate-950 shadow-sm focus-visible:ring-accent-500',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-500 dark:hover:bg-rose-600 shadow-sm focus-visible:ring-rose-500',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 dark:text-slate-300 dark:hover:bg-surface-dark-card focus-visible:ring-slate-400',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`
        ${baseClasses}
        ${sizeClasses[size] || sizeClasses.md}
        ${variantClasses[variant] || variantClasses.primary}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4 shrink-0 text-current" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}

