import React, { useState } from 'react';
import { Clock, Search, Trash2, ArrowRight, Tag, ShieldCheck, AlertTriangle, Calendar, AlertOctagon } from 'lucide-react';
import { getVerdictConfig } from '../lib/ratingStyles';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { useViewport } from '../hooks/useViewport';
import { useAuth } from '../hooks/useAuth';
import { useReports } from '../hooks/useReports';

export function History({ onNavigate, onSelectReport }) {
  const { isDesktop } = useViewport();
  const { isGuest } = useAuth();
  const { reports, total, isLoading, error, deleteReport, refetch } = useReports();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerdict, setFilterVerdict] = useState('all');

  if (isGuest) {
    return (
      <div className="py-16 text-center max-w-md mx-auto space-y-4">
        <div className="w-14 h-14 rounded-full bg-accent-50 dark:bg-amber-950/60 text-accent dark:text-amber-300 mx-auto flex items-center justify-center">
          <Clock className="w-7 h-7 stroke-[1.8]" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          History is Locked in Guest Mode
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Guest scans are processed in transient memory to protect privacy. To save previous scans, track health trends, and revisit verdicts, please log in with your mobile number.
        </p>
        <Button variant="primary" size="md" onClick={() => onNavigate('login')}>
          Sign In with Mobile OTP
        </Button>
      </div>
    );
  }

  const filtered = reports.filter((item) => {
    const matchesSearch = (item.product_name || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesVerdict = filterVerdict === 'all' || (item.verdict || '').toLowerCase() === filterVerdict;
    return matchesSearch && matchesVerdict;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-surface-dark-border">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand dark:text-brand-dark" />
            Scan History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {total} total product {total === 1 ? 'report' : 'reports'} saved to your account
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={refetch}>
          Refresh
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 text-xs rounded-input bg-surface-light-card dark:bg-surface-dark-card border border-slate-300 dark:border-surface-dark-border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Verdict Filter Chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
          {['all', 'good', 'okay', 'avoid'].map((v) => (
            <button
              key={v}
              onClick={() => setFilterVerdict(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors uppercase tracking-wider ${
                filterVerdict === v
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Loading or Error States */}
      {isLoading && (
        <div className="py-16 text-center">
          <Spinner size="md" label="Loading saved scans..." />
        </div>
      )}

      {error && !isLoading && (
        <ErrorState message={error} onRetry={refetch} />
      )}

      {/* Empty State */}
      {!isLoading && !error && filtered.length === 0 && (
        <div className="py-16 text-center rounded-card border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No Saved Scans Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            {searchTerm ? 'No reports matched your search keyword.' : 'Snap your first label to build your safety log.'}
          </p>
          <Button variant="primary" size="sm" onClick={() => onNavigate('home')}>
            Start New Scan
          </Button>
        </div>
      )}

      {/* Report Cards Grid (1 col on mobile, 2 or 3 cols on desktop) */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className={`grid gap-4 ${isDesktop ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filtered.map((item) => {
            const config = getVerdictConfig(item.verdict);
            const Icon = config.icon;
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Recent';

            return (
              <div
                key={item.report_id}
                onClick={() => onSelectReport(item.report_id)}
                className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer select-none group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 inline-flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {item.product_type || 'Food'}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-700 dark:group-hover:text-brand-dark transition-colors line-clamp-1">
                    {item.product_name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {item.summary_reason || 'Personalized analysis completed.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${config.badgeClass}`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    {config.label}
                  </span>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">
                      {item.overall_score}/100
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this report?')) {
                          deleteReport(item.report_id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      aria-label="Delete report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

