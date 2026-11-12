import React, { useState, useEffect } from 'react';
import { Smartphone, ArrowLeft, KeyRound, Check, AlertCircle } from 'lucide-react';
import { Button } from '../components/common/Button';
import { ConsentNotice } from '../components/common/ConsentNotice';
import { requestOtp, verifyOtp } from '../api/auth';
import { useAuth } from '../hooks/useAuth';

export function Login({ onNavigate, onLoginSuccess }) {
  const { loginWithToken, isGuest } = useAuth();
  const [step, setStep] = useState('phone'); // phone | otp
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError(null);

    // Accept a 10-digit Indian mobile (optionally typed with 0 / 91 / +91) or any +<country code> E.164 number.
    const cleaned = phoneNumber.trim().replace(/[\s\-()]/g, '');
    let fullNumber = null;
    if (cleaned.startsWith('+')) {
      if (/^\+[1-9]\d{9,14}$/.test(cleaned)) fullNumber = cleaned;
    } else {
      const digits = cleaned.replace(/^(?:\+?91|0)(?=\d{10}$)/, '');
      if (/^[6-9]\d{9}$/.test(digits)) fullNumber = `+91${digits}`;
    }
    if (!fullNumber) {
      setError('Please enter a valid 10-digit mobile number (it should start with 6, 7, 8 or 9)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await requestOtp(fullNumber);
      setPhoneNumber(fullNumber);
      setOtp('');
      setStep('otp');
      setCountdown(60);
      setInfoMessage(res?.mock_otp_hint ? `Demo mode - your OTP is ${res.mock_otp_hint}` : '');
    } catch (err) {
      setError(err.message || 'Failed to dispatch OTP. Please check your number.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit verification code sent to your phone');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOtp(phoneNumber, otp);
      loginWithToken(res);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        onNavigate('home');
      }
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-md mx-auto px-5 py-8">
      {/* Top Bar */}
      <div>
        <button
          onClick={() => {
            setError(null);
            setInfoMessage('');
            if (step === 'otp') setStep('phone');
            else onNavigate(isGuest ? 'home' : 'welcome');
          }}
          className="inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-1 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 'otp' ? 'Change Phone Number' : 'Back'}
        </button>
      </div>

      {/* Main Form */}
      <div className="my-auto py-6">
        <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-emerald-950/60 border border-brand-200 dark:border-brand-800/80 flex items-center justify-center text-brand-700 dark:text-brand-dark mb-4">
          {step === 'phone' ? <Smartphone className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {step === 'phone' ? 'Mobile Verification' : 'Enter 6-Digit OTP'}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          {step === 'phone'
            ? 'We will send a one-time verification password to confirm your identity.'
            : `We sent a temporary verification code to ${phoneNumber}`}
        </p>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300">
            {infoMessage}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number
              </label>
              <div className="relative flex items-center">
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setError(null); }}
                  className="w-full h-11 px-3.5 rounded-input bg-surface-light-card dark:bg-surface-dark-card border border-slate-300 dark:border-surface-dark-border text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium tabular-nums"
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
              Send Verification OTP
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label htmlFor="otp" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Verification Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(null); }}
                className="w-full h-12 text-center tracking-[0.4em] text-lg font-bold rounded-input bg-surface-light-card dark:bg-surface-dark-card border border-slate-300 dark:border-surface-dark-border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 tabular-nums"
                autoFocus
              />
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading}>
              Verify & Log In
            </Button>

            <div className="text-center pt-2">
              {countdown > 0 ? (
                <span className="text-xs text-slate-400">
                  Resend code in <strong className="tabular-nums font-semibold">{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSendOtp}
                  className="text-xs font-semibold text-brand-700 dark:text-brand-dark hover:underline"
                >
                  Resend OTP Code
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Footer Privacy Guarantee */}
      <ConsentNotice />
    </div>
  );
}