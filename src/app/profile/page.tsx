'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth';
import { KeyRound, CheckCircle2, AlertCircle, Loader2, LogOut, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      setSuccessMessage(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
            My Profile
          </h1>
          <p className="text-xs text-brand-green/70 mt-0.5">
            View your staff details and manage your account security credentials.
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-brand-beige-dark p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-4 border-b border-brand-beige-dark/50 pb-5">
            <div className="w-16 h-16 rounded-full bg-brand-beige text-brand-green flex items-center justify-center text-3xl border border-brand-gold shadow-sm">
              {user?.avatar || '👤'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-brand-green truncate">{user?.name}</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-gold text-brand-green font-mono shrink-0">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-brand-green/60 mt-0.5 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider">
                Full Name
              </span>
              <p className="font-extrabold text-sm text-brand-green">{user?.name || '—'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider">
                Email Address
              </span>
              <p className="font-extrabold text-sm text-brand-green truncate">{user?.email || '—'}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider">
                Contact Number
              </span>
              <p className="font-extrabold text-sm text-brand-green">
                {user?.contactNumber || user?.contact_number || 'Not provided'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider">
                System Role
              </span>
              <p className="font-extrabold text-sm text-brand-green">{user?.role || 'Staff'}</p>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="pt-4 border-t border-brand-beige-dark/50">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound className="w-4 h-4 text-brand-gold" />
              <h3 className="font-extrabold text-sm text-brand-green">Change Password</h3>
            </div>

            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-green">
                  Current Password
                </label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3.5 h-3.5 text-brand-gold" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-brand-beige-dark/50">
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 border border-red-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Portal</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
