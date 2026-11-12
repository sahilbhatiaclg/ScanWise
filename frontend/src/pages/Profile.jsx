import React, { useState } from 'react';
import { User, Shield, Moon, Sun, LogOut, Trash2, Heart, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { Onboarding } from './Onboarding';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export function Profile({ onNavigate }) {
  const { isGuest, isRegisteredUser, user, logout, deleteAccount } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInputText, setDeleteInputText] = useState('');
  const [isEditingHealth, setIsEditingHealth] = useState(false);

  const handleLogout = async () => {
    await logout();
    onNavigate('welcome');
  };

  const handleDeleteAccount = async () => {
    if (deleteInputText.trim().toUpperCase() !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await deleteAccount();
      onNavigate('welcome');
    } catch (err) {
      alert(err.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-surface-dark-border">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 text-brand dark:text-brand-dark" />
          Account & Preferences
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isGuest ? 'Session Configuration (Guest)' : `Registered Account: ${user?.phone_number || ''}`}
        </p>
      </div>

      {/* Guest Mode Callout */}
      {isGuest && (
        <div className="rounded-card border border-amber-200 dark:border-amber-900/60 bg-accent-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <span>You are currently in temporary guest mode.</span>
          </div>
          <Button variant="primary" size="sm" onClick={() => onNavigate('login')}>
            Sign In with OTP
          </Button>
        </div>
      )}

      {/* Health Profile Customizer Section */}
      <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Personal Health Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your age group, health conditions, allergens, and dietary guidelines
            </p>
          </div>
          <Button
            variant={isEditingHealth ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setIsEditingHealth(!isEditingHealth)}
          >
            {isEditingHealth ? 'Close Editor' : 'Edit Rules'}
          </Button>
        </div>

        {isEditingHealth ? (
          <Onboarding onComplete={() => setIsEditingHealth(false)} isModal={true} />
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-400 py-1">
            Tap &ldquo;Edit Rules&rdquo; to modify your active allergy flags, medical contraindications, or dietary preferences.
          </p>
        )}
      </div>

      {/* App Preferences (Theme & Visual) */}
      <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
          Display & Appearance
        </h2>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-slate-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <div>
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                Theme Mode
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Currently using {theme === 'dark' ? 'Dark Obsidian' : 'Light Alabaster'}
              </span>
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            Toggle to {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="rounded-card border border-slate-200 dark:border-surface-dark-border bg-surface-light-card dark:bg-surface-dark-card p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
          Session & Account Management
        </h2>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <Button variant="secondary" size="md" icon={LogOut} onClick={handleLogout}>
            {isGuest ? 'End Guest Session' : 'Sign Out of Account'}
          </Button>

          {isRegisteredUser && (
            <Button
              variant="danger"
              size="md"
              icon={Trash2}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Account
            </Button>
          )}
        </div>
      </div>

      {/* Delete Account Modal / Confirmation Drawer */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-card bg-surface-light-card dark:bg-surface-dark-card border border-rose-300 dark:border-rose-900 p-5 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Delete Your Account?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                This action is irreversible. All saved scan reports, personalized health rules, and credentials will be permanently erased in accordance with DPDP compliance.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Type <strong className="text-rose-600">DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={deleteInputText}
                onChange={(e) => setDeleteInputText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-10 px-3 text-sm text-center font-bold tracking-widest rounded-input bg-surface-light dark:bg-surface-dark border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInputText('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                isLoading={isDeleting}
                disabled={deleteInputText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleDeleteAccount}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

