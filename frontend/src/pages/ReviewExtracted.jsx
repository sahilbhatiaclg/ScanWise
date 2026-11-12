import React, { useState } from 'react';
import { ArrowLeft, Check, Plus, X, Sparkles, Tag, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { ProgressStages } from '../components/scan/ProgressStages';
import { ErrorState } from '../components/common/ErrorState';
import { PRODUCT_TYPES } from '../lib/constants';
import { useScan } from '../hooks/useScan';
import { useAuth } from '../hooks/useAuth';

export function ReviewExtracted({ extractedData, onNavigate, onAnalysisSuccess }) {
  const { isGuest, guestProfile } = useAuth();
  const { stage, stageMessage, error, runAnalysis, saveCorrections } = useScan();

  const [productName, setProductName] = useState(extractedData?.product_name || 'Scanned Product');
  const [category, setCategory] = useState(extractedData?.category || 'food');
  const [ingredients, setIngredients] = useState(() => {
    if (!extractedData?.ingredients) return [];
    return extractedData.ingredients.map((item) =>
      typeof item === 'string' ? item : item.name || item.original_text || 'Ingredient'
    );
  });
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const scanId = extractedData?.scan_id || 'scan-temp-123';
  const confidencePct = Math.round((extractedData?.confidence ?? 0.9) * 100);

  const removeIngredient = (index) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const addIngredient = (e) => {
    e?.preventDefault();
    const trimmed = newIngredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setNewIngredientInput('');
      setIsAdding(false);
    }
  };

  const handleProceed = async () => {
    try {
      // 1. Save user corrections via PATCH
      await saveCorrections(scanId, {
        product_name: productName,
        category,
        ingredients,
      });

      // 2. Trigger deterministic analysis
      const report = await runAnalysis(scanId, isGuest ? guestProfile : null);
      if (onAnalysisSuccess) {
        onAnalysisSuccess(report);
      }
    } catch (err) {
      console.error('Analysis submission failed', err);
    }
  };

  const isAnalyzing = stage === 'checking_ingredients' || stage === 'building_report';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div>
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retake or Back
        </button>
      </div>

      {isAnalyzing ? (
        <ProgressStages stage={stage} customMessage={stageMessage} />
      ) : (
        <>
          {error && <ErrorState message={error} />}

          <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 md:p-6 shadow-sm space-y-5">
            {/* Header with Confidence */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Verify Extracted Ingredients
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Review the OCR output below and fix any typos before health analysis.
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {confidencePct}% Match
                </span>
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Product Title
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-input bg-surface-light dark:bg-surface-dark border border-slate-300 dark:border-surface-dark-border text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Product Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRODUCT_TYPES.map((pt) => {
                  const isSelected = category === pt.code;
                  return (
                    <button
                      type="button"
                      key={pt.code}
                      onClick={() => setCategory(pt.code)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-colors ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50 text-brand-900 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-brand-dark font-semibold'
                          : 'border-slate-200 dark:border-surface-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extracted Ingredients Chip Cloud */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Detected Ingredients ({ingredients.length})
                </label>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 dark:text-brand-dark hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Ingredient
                </button>
              </div>

              {isAdding && (
                <form onSubmit={addIngredient} className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="e.g. Citric Acid, Wheat Flour"
                    value={newIngredientInput}
                    onChange={(e) => setNewIngredientInput(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-surface-light dark:bg-surface-dark text-xs"
                    autoFocus
                  />
                  <Button type="submit" size="sm" variant="primary">
                    Add
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                </form>
              )}

              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 min-h-[100px]">
                {ingredients.map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs group"
                  >
                    <span>{item}</span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded-full"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={ArrowRight}
                onClick={handleProceed}
                disabled={ingredients.length === 0}
                className="shadow-md"
              >
                Confirm & Analyze Health Impact
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

