import React from 'react';
import { HelpCircle, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export function NotFound({ onNavigate }) {
  return (
    <div className="py-20 text-center max-w-sm mx-auto space-y-4">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
        <HelpCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Page Not Found
      </h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        The screen or report you requested does not exist or has been removed.
      </p>
      <Button variant="primary" size="md" icon={Home} onClick={() => onNavigate('home')}>
        Return to Dashboard
      </Button>
    </div>
  );
}

