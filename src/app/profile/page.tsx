'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth';
import {
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Shield,
  Edit3,
  Save,
  X,
  Lock,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setEditName(user?.name || '');
    setEditContact(user?.contactNumber || user?.contact_number || '');
    setIsEditingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileError(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      setProfileError('Full Name must be at least 2 characters long.');
      return;
    }

    const trimmedContact = editContact.trim();
    if (trimmedContact && (!/^\d+$/.test(trimmedContact) || trimmedContact.length !== 10)) {
      setProfileError('Contact Number must be exactly 10 numeric digits.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const res = await updateProfile({
        name: trimmedName,
        contactNumber: trimmedContact || undefined,
      });

      if (res.success) {
        setProfileSuccess('Profile details updated successfully!');
        setIsEditingProfile(false);
      } else {
        setProfileError(res.error || 'Failed to update profile.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile.';
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      setErrorMessage('New passwords do not match.');
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              My Profile
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              View your staff details and manage your account security credentials.
            </p>
          </div>
          {!isEditingProfile && (
            <button
              onClick={handleStartEdit}
              className="px-3.5 py-2 rounded-xl bg-brand-green text-brand-beige font-bold text-xs flex items-center gap-1.5 hover:bg-brand-green-hover transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-brand-gold" />
              <span>Edit Profile</span>
            </button>
          )}
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

          {/* Feedback Messages */}
          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{profileError}</span>
            </div>
          )}

          {/* Either Edit Form or View Grid */}
          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-brand-beige-dark/40">
                <span className="text-xs font-bold text-brand-green uppercase tracking-wider">
                  Edit Profile Details
                </span>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-xs text-brand-green/60 hover:text-brand-green flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Full Name Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="e.g. Admin Manager"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green"
                  />
                </div>

                {/* Contact Number Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    Contact Number (10 Digits)
                  </label>
                  <input
                    type="text"
                    autoComplete="tel"
                    inputMode="numeric"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green placeholder:text-brand-green/30"
                  />
                </div>

                {/* Email (Read-only) */}
                <div className="space-y-1 opacity-75">
                  <label className="block text-xs font-bold text-brand-green/80 flex items-center gap-1.5">
                    <span>Email Address</span>
                    <Lock className="w-3 h-3 text-brand-gold" />
                    <span className="text-[10px] text-brand-green/50 font-normal">(Read-only)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || '—'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark/60 text-xs bg-brand-beige-light/50 font-medium text-brand-green/70 cursor-not-allowed"
                  />
                </div>

                {/* System Role (Read-only) */}
                <div className="space-y-1 opacity-75">
                  <label className="block text-xs font-bold text-brand-green/80 flex items-center gap-1.5">
                    <span>System Role</span>
                    <Lock className="w-3 h-3 text-brand-gold" />
                    <span className="text-[10px] text-brand-green/50 font-normal">(Read-only)</span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role || 'Staff'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark/60 text-xs bg-brand-beige-light/50 font-medium text-brand-green/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSavingProfile}
                  className="px-4 py-2.5 rounded-xl bg-brand-beige border border-brand-beige-dark hover:bg-brand-beige-dark/20 text-brand-green font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
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
          )}

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
                  autoComplete="current-password"
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
                    autoComplete="new-password"
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
                    autoComplete="new-password"
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
