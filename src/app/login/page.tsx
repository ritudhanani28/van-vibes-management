'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const validateField = (field: 'email' | 'password', value: string): string | undefined => {
    if (field === 'email') {
      const trimmed = value.trim();
      if (!trimmed) {
        return 'Please enter your email.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return 'Please enter a valid email address.';
      }
    }
    if (field === 'password') {
      if (!value) {
        return 'Please enter your password.';
      }
    }
    return undefined;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateField('email', val) }));
    }
  };

  const handleEmailBlur = () => {
    setFieldErrors((prev) => ({ ...prev, email: validateField('email', email) }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: validateField('password', val) }));
    }
  };

  const handlePasswordBlur = () => {
    setFieldErrors((prev) => ({ ...prev, password: validateField('password', password) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const emailErr = validateField('email', email);
    const passErr = validateField('password', password);

    const errors: { email?: string; password?: string } = {};
    if (emailErr) errors.email = emailErr;
    if (passErr) errors.password = passErr;

    setFieldErrors(errors);

    if (emailErr) {
      emailInputRef.current?.focus();
      return;
    }
    if (passErr) {
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setGeneralError(result.error || 'Invalid email or password.');
      }
    } catch {
      setGeneralError('Unable to connect to the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-green flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-green-surface rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-400">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-2xl sm:text-3xl mx-auto border-2 border-brand-gold shadow-lg">
            व
          </div>
          <div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-brand-beige tracking-tight">
                वन VIBES
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-brand-gold text-brand-green">
                Console
              </span>
            </div>
            <p className="text-xs sm:text-sm text-brand-beige-muted mt-1 font-medium">
              Vaan Vibes Cafe & Restro • Management Portal
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-brand-beige-dark space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <div className="border-b border-brand-beige-dark/50 pb-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-brand-green">Sign In</h2>
            <p className="text-xs text-brand-green/60 mt-0.5">
              Enter your staff credentials to access operations
            </p>
          </div>

          {/* General Error Message Banner */}
          {generalError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email-input" className="text-xs font-bold text-brand-green block">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-brand-green/40 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  ref={emailInputRef}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  placeholder="e.g. admin@vaanvibes.in"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm text-brand-green placeholder:text-brand-green/30 focus:outline-none min-h-[42px] transition-colors ${
                    fieldErrors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                      : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p id="login-email-error" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password Field with Toggle (👁️) */}
            <div className="space-y-1.5">
              <label htmlFor="login-password-input" className="text-xs font-bold text-brand-green block">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-brand-green/40 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter your password"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-xs sm:text-sm text-brand-green placeholder:text-brand-green/30 focus:outline-none min-h-[42px] transition-colors ${
                    fieldErrors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                      : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-3 text-brand-green/40 hover:text-brand-green transition-colors p-1 cursor-pointer disabled:opacity-50"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="login-password-error" className="text-xs font-semibold text-red-600 flex items-center gap-1.5 mt-1 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 disabled:opacity-50 min-h-[44px] cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 rounded-full border-2 border-brand-beige border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4 text-brand-gold" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-brand-beige-muted/60">
          Restricted access for authorized Vaan Vibes Cafe staff only.
        </p>
      </div>
    </div>
  );
}
