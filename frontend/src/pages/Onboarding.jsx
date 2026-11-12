import React, { useState, useEffect } from 'react';
import { Shield, Check, Heart, User, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import {
  AGE_GROUPS,
  HEALTH_CONDITIONS,
  ALLERGENS,
  SKIN_TYPES,
  DIETARY_PREFERENCES,
} from '../lib/constants';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';

export function Onboarding({ onComplete, isModal = false }) {
  const { isGuest } = useAuth();
  const { profile, saveProfile, isLoading } = useProfile();

  const [ageGroup, setAgeGroup] = useState('adult');
  const [conditions, setConditions] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [skinType, setSkinType] = useState('normal');
  const [dietaryPref, setDietaryPref] = useState('vegetarian');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.age_group) setAgeGroup(profile.age_group);
      if (Array.isArray(profile.conditions)) setConditions(profile.conditions);
      if (Array.isArray(profile.allergens)) setAllergens(profile.allergens);
      if (profile.skin_type) setSkinType(profile.skin_type);
      if (profile.dietary_preference) setDietaryPref(profile.dietary_preference);
    }
  }, [profile]);

  const toggleCondition = (code) => {
    setConditions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleAllergen = (code) => {
    setAllergens((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const payload = {
      age_group: ageGroup,
      conditions,
      allergens,
      skin_type: skinType,
      dietary_preference: dietaryPref,
    };

    try {
      await saveProfile(payload);
      setSavedSuccess(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 400);
    } catch (err) {
      console.error('Save profile failed', err);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${isModal ? '' : 'py-6 px-4'}`}>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-brand-700 dark:text-brand-dark text-xs font-semibold uppercase tracking-wider mb-1">
          <Heart className="w-4 h-4" />
          {isGuest ? 'Guest Health Filters' : 'Personal Health Profile'}
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Customize Your Safety Rules
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          ScanWise matches ingredients against these preferences to flag contraindications and portion limits.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Age Group */}
        <section className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
            1. Age Group <span className="text-brand-600 dark:text-brand-dark">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AGE_GROUPS.map((grp) => {
              const selected = ageGroup === grp.code;
              return (
                <button
                  type="button"
                  key={grp.code}
                  onClick={() => setAgeGroup(grp.code)}
                  className={`p-3 text-left rounded-xl border text-xs font-medium transition-all ${
                    selected
                      ? 'border-brand-600 bg-brand-50 dark:bg-emerald-950/60 dark:border-brand-dark text-brand-900 dark:text-emerald-200 font-semibold shadow-xs'
                      : 'border-slate-200 dark:border-surface-dark-border bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="block">{grp.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Health Conditions */}
        <section className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            2. Health Conditions
          </label>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
            Select any conditions so high-risk ingredients are flagged immediately.
          </p>
          <div className="flex flex-wrap gap-2">
            {HEALTH_CONDITIONS.map((cond) => {
              const active = conditions.includes(cond.code);
              return (
                <button
                  type="button"
                  key={cond.code}
                  onClick={() => toggleCondition(cond.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />}
                  {cond.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Declared Allergens */}
        <section className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            3. Allergies & Food Sensitivities
          </label>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
            Allergen matches are automatically escalated to Risk Level 3.
          </p>
          <div className="flex flex-wrap gap-2">
            {ALLERGENS.map((alg) => {
              const active = allergens.includes(alg.code);
              return (
                <button
                  type="button"
                  key={alg.code}
                  onClick={() => toggleAllergen(alg.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 ${
                    active
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {active && <Check className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />}
                  {alg.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Skin Type & Dietary Preference (Side-by-side on desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              4. Skin Type (For Cosmetics)
            </label>
            <div className="space-y-1.5">
              {SKIN_TYPES.map((st) => (
                <button
                  type="button"
                  key={st.code}
                  onClick={() => setSkinType(st.code)}
                  className={`w-full px-3 py-2 text-left rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                    skinType === st.code
                      ? 'bg-brand-50 dark:bg-emerald-950/60 border-brand-500 dark:border-brand-dark text-brand-900 dark:text-emerald-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span>{st.name}</span>
                  {skinType === st.code && <Check className="w-3.5 h-3.5 text-brand" />}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
              5. Dietary Preference
            </label>
            <div className="space-y-1.5">
              {DIETARY_PREFERENCES.map((dp) => (
                <button
                  type="button"
                  key={dp.code}
                  onClick={() => setDietaryPref(dp.code)}
                  className={`w-full px-3 py-2 text-left rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                    dietaryPref === dp.code
                      ? 'bg-brand-50 dark:bg-emerald-950/60 border-brand-500 dark:border-brand-dark text-brand-900 dark:text-emerald-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span>{dp.name}</span>
                  {dietaryPref === dp.code && <Check className="w-3.5 h-3.5 text-brand" />}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            icon={ArrowRight}
            className="shadow-md"
          >
            {savedSuccess ? 'Profile Saved!' : 'Save & Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}

