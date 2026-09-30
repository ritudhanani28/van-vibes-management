'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { authApi } from '@/api/auth';
import { User } from '@/types/auth';
import {
  ChefHat,
  Plus,
  X,
  Mail,
  Phone,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
} from 'lucide-react';

export default function ChefManagementPage() {
  const [chefs, setChefs] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const fetchChefs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await authApi.getChefs();
      setChefs(data);
    } catch (err) {
      console.error('Failed to load chefs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChefs();
  }, [fetchChefs]);

  const handleOpenModal = () => {
    setName('');
    setEmail('');
    setContactNumber('');
    setPassword('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setFormError(null);
  };

  const handleCreateChef = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedContact = contactNumber.trim();

    if (!trimmedName) {
      setFormError('Chef name is required.');
      return;
    }
    if (!trimmedEmail) {
      setFormError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!trimmedContact) {
      setFormError('Contact number is required.');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newChef = await authApi.createChef({
        name: trimmedName,
        email: trimmedEmail,
        contactNumber: trimmedContact,
        password,
      });

      // Update state without manual refresh
      setChefs((prev) => [newChef, ...prev]);
      setIsModalOpen(false);
      setBannerSuccess(`Chef ${newChef.name} created successfully.`);
      setTimeout(() => setBannerSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create chef account. Email may already be registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
                Chef Management
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-green text-brand-beige">
                {chefs.length} Active Chefs
              </span>
            </div>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Create and manage kitchen staff accounts with Chef role access.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-brand-gold" />
            <span>Add Chef</span>
          </button>
        </div>

        {bannerSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{bannerSuccess}</span>
          </div>
        )}

        {/* Chefs Table / List */}
        <div className="bg-white rounded-3xl border border-brand-beige-dark overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-brand-beige-dark/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-brand-gold" />
              <h2 className="font-extrabold text-sm text-brand-green">Registered Kitchen Staff</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 text-brand-green/40 animate-spin mx-auto" />
              <p className="text-xs text-brand-green/60 mt-2 font-medium">Loading chef accounts...</p>
            </div>
          ) : chefs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Users className="w-10 h-10 text-brand-green/20 mx-auto" />
              <h3 className="font-extrabold text-brand-green text-sm">No chef accounts found</h3>
              <p className="text-xs text-brand-green/60 max-w-sm mx-auto">
                No chef accounts have been created yet. Click "+ Add Chef" to create a kitchen account.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-beige-dark bg-brand-beige-light/50 text-[11px] font-bold text-brand-green/60 uppercase tracking-wider">
                    <th className="px-5 py-3">Chef Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Contact Number</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-right">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-beige-dark/40 font-medium">
                  {chefs.map((chef) => (
                    <tr key={chef.id} className="hover:bg-brand-beige-light/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-brand-green flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-beige flex items-center justify-center text-sm border border-brand-gold shrink-0">
                          👨‍🍳
                        </div>
                        <span>{chef.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-brand-green/80 font-mono">
                        {chef.email}
                      </td>
                      <td className="px-5 py-3.5 text-brand-green/80 font-mono">
                        {chef.contactNumber || chef.contact_number || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-brand-gold/20 text-brand-green border border-brand-gold/40">
                          {chef.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Chef Custom Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-brand-beige-dark shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-brand-beige-dark/50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-beige text-brand-green flex items-center justify-center border border-brand-gold">
                  <ChefHat className="w-4 h-4 text-brand-green" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-brand-green">Add Chef</h3>
                  <p className="text-[11px] text-brand-green/60">Create a new kitchen staff account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="w-8 h-8 rounded-full bg-brand-beige hover:bg-brand-beige-dark text-brand-green flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateChef} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-brand-green">Chef Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sanjay Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-brand-green">Email</label>
                <input
                  type="email"
                  placeholder="chef@vaanvibes.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-brand-green">Contact Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-brand-green">Password</label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
                <p className="text-[10px] text-brand-green/60">
                  Password will not be displayed again after creation.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-brand-green">Role</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark text-brand-green font-bold flex items-center justify-between">
                  <span>Chef</span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-brand-gold text-brand-green font-mono">
                    Assigned by backend
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green font-bold text-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-gold" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Add Chef</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
