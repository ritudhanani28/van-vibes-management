'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ChefHat, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Failed to sign in. Please check credentials.');
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (role: 'admin' | 'chef') => {
    if (role === 'admin') {
      setEmail('admin@vaanvibes.com');
      setPassword('admin123');
    } else {
      setEmail('chef@vaanvibes.com');
      setPassword('chef123');
    }
    setError(null);
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

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-green block">
                Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-brand-green/40 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@vaanvibes.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-brand-green placeholder:text-brand-green/30 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-green shadow-2xs min-h-[42px]"
                  required
                />
              </div>
            </div>

            {/* Password Field with Toggle (👁️) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-green block">Password</label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-brand-green/40 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-beige-dark text-brand-green placeholder:text-brand-green/30 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-green shadow-2xs min-h-[42px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-brand-green/40 hover:text-brand-green transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 disabled:opacity-50 min-h-[44px]"
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

          {/* Quick Demo Role Fillers */}
          <div className="pt-2 border-t border-brand-beige-dark/50 space-y-2">
            <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider block text-center">
              Quick Demo Access
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin')}
                className="p-2.5 rounded-xl bg-brand-beige-light hover:bg-brand-beige text-brand-green border border-brand-beige-dark text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-green">
                  <UserCheck className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Admin Mode</span>
                </div>
                <span className="text-[10px] text-brand-green/60 mt-1 truncate">
                  admin@vaanvibes.com
                </span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('chef')}
                className="p-2.5 rounded-xl bg-brand-beige-light hover:bg-brand-beige text-brand-green border border-brand-beige-dark text-left transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-green">
                  <ChefHat className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Chef Mode</span>
                </div>
                <span className="text-[10px] text-brand-green/60 mt-1 truncate">
                  chef@vaanvibes.com
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-brand-beige-muted/60">
          Restricted access for authorized Vaan Vibes Cafe staff only.
        </p>
      </div>
    </div>
  );
}
