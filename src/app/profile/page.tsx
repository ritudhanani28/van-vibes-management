'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FieldError, FormError } from '@/components/ui/FieldError';
import { validatePhoneField } from '@/lib/validation';
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
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<{ name?: string; contact?: string }>({});

  const handleStartEdit = () => {
    setEditName(user?.name || '');
    setEditContact(user?.contactNumber || user?.contact_number || '');
    setIsEditingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);
    setProfileFieldErrors({});
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileError(null);
    setProfileFieldErrors({});
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setProfileFieldErrors({});

    const trimmedName = editName.trim();
    const trimmedContact = editContact.trim();
    const errors: { name?: string; contact?: string } = {};

    if (!trimmedName) {
      errors.name = 'Please enter your full name.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Full Name must be at least 2 characters long.';
    }

    if (trimmedContact) {
      const contactErr = validatePhoneField(trimmedContact, false);
      if (contactErr) errors.contact = contactErr;
    }

    if (Object.keys(errors).length > 0) {
      setProfileFieldErrors(errors);
      if (errors.name) document.getElementById('profile_full_name')?.focus();
      else if (errors.contact) document.getElementById('profile_contact_number')?.focus();
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
        setProfileFieldErrors({});
      } else {
        setProfileError(res.error || 'Failed to update profile.');
      }
    } catch (err: unknown) {
      const fieldErrs: { name?: string; contact?: string } = {};
      if (err && typeof err === 'object' && 'fieldErrors' in err) {
        const rawF = (err as { fieldErrors: Record<string, string> }).fieldErrors;
        if (rawF.name) fieldErrs.name = rawF.name;
        if (rawF.contact_number || rawF.contactNumber) fieldErrs.contact = rawF.contact_number || rawF.contactNumber;
      }

      if (Object.keys(fieldErrs).length > 0) {
        setProfileFieldErrors(fieldErrs);
      } else {
        const msg = err instanceof Error ? err.message : 'Failed to update profile.';
        setProfileError(msg);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setPasswordFieldErrors({});

    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = 'Please enter your current password.';
    }

    if (!newPassword) {
      errors.new = 'Please enter a new password.';
    } else if (newPassword.length < 6) {
      errors.new = 'New password must be at least 6 characters long.';
    }

    if (!confirmNewPassword) {
      errors.confirm = 'Please repeat the new password.';
    } else if (newPassword && newPassword !== confirmNewPassword) {
      errors.confirm = 'New passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordFieldErrors(errors);
      if (errors.current) document.getElementById('current_password_input')?.focus();
      else if (errors.new) document.getElementById('new_password_input')?.focus();
      else if (errors.confirm) document.getElementById('confirm_new_password_input')?.focus();
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
      setPasswordFieldErrors({});
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
            <form noValidate onSubmit={handleSaveProfile} className="space-y-4">
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
                    id="profile_full_name"
                    autoComplete="name"
                    required
                    aria-invalid={!!profileFieldErrors.name}
                    aria-describedby={profileFieldErrors.name ? "profile-name-error" : undefined}
                    placeholder="e.g. Admin Manager"
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      if (profileFieldErrors.name) setProfileFieldErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none font-medium text-brand-green transition-colors ${
                      profileFieldErrors.name
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                        : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 bg-white'
                    }`}
                  />
                  <FieldError message={profileFieldErrors.name} id="profile-name-error" />
                </div>

                {/* Contact Number Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    Contact Number (10 Digits)
                  </label>
                  <input
                    type="tel"
                    id="profile_contact_number"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                    aria-invalid={!!profileFieldErrors.contact}
                    aria-describedby={profileFieldErrors.contact ? "profile-contact-error" : undefined}
                    placeholder="e.g. 9876543210"
                    value={editContact}
                    onChange={(e) => {
                      setEditContact(e.target.value.replace(/\D/g, '').slice(0, 10));
                      if (profileFieldErrors.contact) setProfileFieldErrors((prev) => ({ ...prev, contact: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none font-medium font-mono text-brand-green placeholder:text-brand-green/30 transition-colors ${
                      profileFieldErrors.contact
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                        : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 bg-white'
                    }`}
                  />
                  <FieldError message={profileFieldErrors.contact} id="profile-contact-error" />
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

            <form noValidate onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-brand-green">
                  Current Password
                </label>
                <input
                  type="password"
                  id="current_password_input"
                  autoComplete="current-password"
                  aria-invalid={!!passwordFieldErrors.current}
                  aria-describedby={passwordFieldErrors.current ? "current-password-error" : undefined}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (passwordFieldErrors.current) setPasswordFieldErrors((prev) => ({ ...prev, current: undefined }));
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                    passwordFieldErrors.current
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                      : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                  }`}
                />
                <FieldError message={passwordFieldErrors.current} id="current-password-error" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new_password_input"
                    autoComplete="new-password"
                    aria-invalid={!!passwordFieldErrors.new}
                    aria-describedby={passwordFieldErrors.new ? "new-password-error" : undefined}
                    placeholder="Min. 6 characters"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (passwordFieldErrors.new) setPasswordFieldErrors((prev) => ({ ...prev, new: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                      passwordFieldErrors.new
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                        : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                    }`}
                  />
                  <FieldError message={passwordFieldErrors.new} id="new-password-error" />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-brand-green">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm_new_password_input"
                    autoComplete="new-password"
                    aria-invalid={!!passwordFieldErrors.confirm}
                    aria-describedby={passwordFieldErrors.confirm ? "confirm-password-error" : undefined}
                    placeholder="Repeat new password"
                    value={confirmNewPassword}
                    onChange={(e) => {
                      setConfirmNewPassword(e.target.value);
                      if (passwordFieldErrors.confirm) setPasswordFieldErrors((prev) => ({ ...prev, confirm: undefined }));
                    }}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-colors ${
                      passwordFieldErrors.confirm
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-red-50/10'
                        : 'border-brand-beige-dark focus:border-brand-green focus:ring-2 focus:ring-brand-green/20'
                    }`}
                  />
                  <FieldError message={passwordFieldErrors.confirm} id="confirm-password-error" />
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
