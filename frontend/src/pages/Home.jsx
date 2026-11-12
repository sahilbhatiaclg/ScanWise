import React, { useState } from 'react';
import { Camera, UploadCloud, Sparkles, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Clock, HelpCircle } from 'lucide-react';
import { CameraCapture } from '../components/scan/CameraCapture';
import { UploadButton } from '../components/scan/UploadButton';
import { ProgressStages } from '../components/scan/ProgressStages';
import { ErrorState } from '../components/common/ErrorState';
import { Button } from '../components/common/Button';
import { useViewport } from '../hooks/useViewport';
import { useAuth } from '../hooks/useAuth';
import { useScan } from '../hooks/useScan';

export function Home({ onNavigate, onStartScanReview }) {
  const { isDesktop, isMobile } = useViewport();
  const { isGuest, user } = useAuth();
  const { stage, stageMessage, error, processImageFile, reset } = useScan();

  const handleFileSelected = async (file) => {
    try {
      const extracted = await processImageFile(file);
      if (extracted && onStartScanReview) {
        onStartScanReview(extracted);
      }
    } catch (err) {
      console.error('OCR Extraction error', err);
    }
  };

  const isScanning = stage !== 'idle' && stage !== 'error' && stage !== 'complete';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-surface-dark-border">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isGuest ? 'Welcome, Guest' : `Hello ${user?.phone_number || 'Healthy Human'}`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Capture any back-of-pack ingredient panel for instant safety verification.
          </p>
        </div>

        {isGuest && (
          <Button
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={() => onNavigate('onboarding')}
            className="self-start sm:self-auto text-accent dark:text-amber-300 border-amber-300 dark:border-amber-800"
          >
            Adjust Guest Filters
          </Button>
        )}
      </div>

      {/* Active OCR Processing State */}
      {isScanning && (
        <div className="py-8 max-w-lg mx-auto">
          <ProgressStages stage={stage} customMessage={stageMessage} />
        </div>
      )}

      {/* Error State */}
      {error && !isScanning && (
        <ErrorState
          title="Label Scanning Failed"
          message={error}
          onRetry={reset}
          className="max-w-md mx-auto"
        />
      )}

      {/* Main Scan Trigger Workspace */}
      {!isScanning && (
        <div className={`grid gap-6 ${isDesktop ? 'grid-cols-12 items-start' : 'grid-cols-1'}`}>
          {/* Scan Actions (Col 1 on desktop) */}
          <div className={`${isDesktop ? 'col-span-7' : 'col-span-1'} space-y-4`}>
            <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-dark mb-2">
                <Camera className="w-4 h-4" />
                Capture Back Label
              </div>

              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Point Camera at Ingredients List
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Ensure good lighting and keep the nutritional table & ingredient paragraph flat in the frame.
              </p>

              {/* Mobile-preferred Camera Button */}
              <div className="space-y-3">
                <CameraCapture onCapture={handleFileSelected} isLoading={isScanning} />
                <div className="relative my-3 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-surface-light-card dark:bg-surface-dark-card text-[11px] font-medium text-slate-400 uppercase">
                    or
                  </span>
                </div>
                <UploadButton onUpload={handleFileSelected} isLoading={isScanning} />
              </div>
            </div>
          </div>

          {/* Guidelines & Recent Activity (Col 2 on desktop) */}
          <div className={`${isDesktop ? 'col-span-5' : 'col-span-1'} space-y-4`}>
            {/* Quick Tips */}
            <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-brand dark:text-brand-dark" />
                Tips for 100% OCR Accuracy
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                  <span>Flatten curved packaging (bottles/pouches) to avoid distorted words.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                  <span>Avoid glossy reflection or glare directly over allergen warnings.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                  <span>Both food & cosmetics labels are automatically identified.</span>
                </li>
              </ul>
            </div>

            {/* Quick Link to History */}
            {!isGuest && (
              <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      View Saved History
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Revisit previous product analyses
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('history')}
                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

