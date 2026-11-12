import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, Share2, Download, RefreshCw } from 'lucide-react';
import { VerdictCard } from '../components/report/VerdictCard';
import { RatingPieChart } from '../components/report/RatingPieChart';
import { CategoryPieChart } from '../components/report/CategoryPieChart';
import { ConsumptionCard } from '../components/report/ConsumptionCard';
import { IngredientList } from '../components/report/IngredientList';
import { Disclaimer } from '../components/report/Disclaimer';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { ErrorState } from '../components/common/ErrorState';
import { useViewport } from '../hooks/useViewport';
import { useAuth } from '../hooks/useAuth';
import { useReports } from '../hooks/useReports';

export function Report({ report: initialReport, reportId, onNavigate }) {
  const { isDesktop } = useViewport();
  const { isRegisteredUser } = useAuth();
  const { loadSingleReport, deleteReport } = useReports();

  const [report, setReport] = useState(initialReport || null);
  const [isLoading, setIsLoading] = useState(!initialReport && Boolean(reportId));
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!initialReport && reportId) {
      setIsLoading(true);
      loadSingleReport(reportId)
        .then((data) => setReport(data))
        .catch((err) => setError(err.message || 'Could not load report'))
        .finally(() => setIsLoading(false));
    }
  }, [initialReport, reportId, loadSingleReport]);

  const handleDelete = async () => {
    if (!report?.report_id || !window.confirm('Are you sure you want to delete this report from your history?')) {
      return;
    }
    setIsDeleting(true);
    try {
      await deleteReport(report.report_id);
      onNavigate('history');
    } catch (err) {
      alert(err.message || 'Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <Spinner size="lg" label="Loading health report..." />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="py-12 max-w-md mx-auto">
        <ErrorState
          title="Report Not Found"
          message={error || 'We could not find the requested scan report.'}
          onRetry={() => onNavigate('home')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-surface-dark-border">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Scan
        </button>

        <div className="flex items-center gap-2">
          {isRegisteredUser && report.report_id && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              isLoading={isDeleting}
              onClick={handleDelete}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Primary Verdict Card */}
      <VerdictCard report={report} />

      {/* Responsive Grid Layout */}
      <div className={`grid gap-6 ${isDesktop ? 'grid-cols-12 items-start' : 'grid-cols-1'}`}>
        {/* Left Column (Charts on desktop) */}
        <div className={`${isDesktop ? 'col-span-5' : 'col-span-1'} space-y-6`}>
          <RatingPieChart breakdown={report.breakdown} ingredients={report.ingredients} />
          <CategoryPieChart breakdown={report.breakdown} ingredients={report.ingredients} />
          <ConsumptionCard guidance={report.guidance} />
        </div>

        {/* Right Column (Ingredient List Accordion on desktop) */}
        <div className={`${isDesktop ? 'col-span-7' : 'col-span-1'} space-y-6`}>
          <IngredientList ingredients={report.ingredients} />
        </div>
      </div>

      {/* Mandatory Regulatory / Clinical Disclaimer */}
      <Disclaimer />
    </div>
  );
}

