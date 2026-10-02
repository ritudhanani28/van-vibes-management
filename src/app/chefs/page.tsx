'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { authApi } from '@/api/auth';
import { User, UserRole } from '@/types/auth';
import { CustomSelect } from '@/components/ui/CustomSelect';
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
  Trash2,
  Edit3,
} from 'lucide-react';

export default function ChefManagementPage() {
  const [chefs, setChefs] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Chef Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addContact, setAddContact] = useState('');
  const [addRole, setAddRole] = useState<UserRole>('CHEF');
  const [addPassword, setAddPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Chef Modal State
  const [editingChef, setEditingChef] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('CHEF');
  const [editIsActive, setEditIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [chefToDelete, setChefToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Success Notification Banner
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const showSuccessBanner = (message: string) => {
    setBannerSuccess(message);
    setTimeout(() => setBannerSuccess(null), 4000);
  };

  useEffect(() => {
    let active = true;
    authApi.getChefs().then((data) => {
      if (active) setChefs(data);
    }).catch((err) => {
      console.error('Error fetching chefs:', err);
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  // Validation Helpers
  const validateContactNumber = (num: string): string | null => {
    const trimmed = num.trim();
    if (!trimmed) {
      return 'Contact number is required.';
    }
    if (!/^\d+$/.test(trimmed)) {
      return 'Contact number must contain only numeric digits (no letters, spaces, or special characters).';
    }
    if (trimmed.length !== 10) {
      return 'Contact number must be exactly 10 digits.';
    }
    return null;
  };

  const validatePasswordStrength = (pwd: string): string | null => {
    if (!pwd) {
      return 'Password is required.';
    }
    if (pwd.length < 6) {
      return 'Password must be at least 6 characters long.';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter (A-Z).';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter (a-z).';
    }
    if (!/[0-9]/.test(pwd)) {
      return 'Password must contain at least one number (0-9).';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/.test(pwd)) {
      return 'Password must contain at least one special character (!@#$%^&*...).';
    }
    return null;
  };

  // Open Add Chef Modal
  const handleOpenAddModal = () => {
    setAddName('');
    setAddEmail('');
    setAddContact('');
    setAddRole('CHEF');
    setAddPassword('');
    setAddError(null);
    setIsAddModalOpen(true);
  };

  // Handle Add Chef Submission
  const handleAddChef = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const trimmedName = addName.trim();
    const trimmedEmail = addEmail.trim();

    if (!trimmedName) {
      setAddError('Chef name is required.');
      return;
    }
    if (!trimmedEmail) {
      setAddError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setAddError('Please enter a valid email address (e.g. chef@vaanvibes.in).');
      return;
    }

    const contactErr = validateContactNumber(addContact);
    if (contactErr) {
      setAddError(contactErr);
      return;
    }

    if (!addRole || addRole !== 'CHEF') {
      setAddError('Role must be Chef.');
      return;
    }

    const passErr = validatePasswordStrength(addPassword);
    if (passErr) {
      setAddError(passErr);
      return;
    }

    try {
      setIsAdding(true);
      const newChef = await authApi.createChef({
        name: trimmedName,
        email: trimmedEmail,
        contactNumber: addContact.trim(),
        role: 'CHEF',
        password: addPassword,
      });

      setChefs((prev) => [newChef, ...prev]);
      showSuccessBanner(`Chef "${newChef.name}" account created successfully.`);
      setIsAddModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create chef account. Email may already be registered.';
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  // Open Edit Chef Modal Directly (Only via Edit button in Actions column)
  const handleOpenEditModal = (chef: User) => {
    setEditingChef(chef);
    setEditName(chef.name || '');
    setEditEmail(chef.email || '');
    setEditContact(chef.contactNumber || chef.contact_number || '');
    setEditRole('CHEF');
    setEditIsActive(chef.is_active !== undefined ? chef.is_active : true);
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // Handle Edit Chef Submission
  const handleSaveEditChef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChef) return;
    setEditError(null);

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();

    if (!trimmedName) {
      setEditError('Chef name is required.');
      return;
    }
    if (!trimmedEmail) {
      setEditError('Email address is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEditError('Please enter a valid email address.');
      return;
    }

    const contactErr = validateContactNumber(editContact);
    if (contactErr) {
      setEditError(contactErr);
      return;
    }

    try {
      setIsSavingEdit(true);
      const updated = await authApi.updateChef(editingChef.id, {
        name: trimmedName,
        email: trimmedEmail,
        contactNumber: editContact.trim(),
        role: 'CHEF',
        isActive: editIsActive,
      });

      setChefs((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showSuccessBanner(`Chef "${updated.name}" details updated successfully.`);

      setIsEditModalOpen(false);
      setEditingChef(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update chef details.';
      setEditError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Delete Chef
  const handleDeleteChef = async () => {
    if (!chefToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await authApi.deleteChef(chefToDelete.id);
      setChefs((prev) => prev.filter((c) => c.id !== chefToDelete.id));
      showSuccessBanner(`Chef "${chefToDelete.name}" was successfully removed.`);
      setChefToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete chef. Please try again.';
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Success Banner */}
        {bannerSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 font-medium text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{bannerSuccess}</span>
            </div>
            <button
              onClick={() => setBannerSuccess(null)}
              className="text-emerald-500 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-beige-dark shadow-2xs">
          <div>
            <h1 className="text-2xl font-black text-brand-green flex items-center gap-2.5">
              <div className="p-2 bg-brand-beige rounded-2xl border border-brand-gold/40 text-brand-green">
                <ChefHat className="w-6 h-6" />
              </div>
              Chef Management
            </h1>
            <p className="text-xs text-brand-green/60 mt-1 font-medium">
              Manage and configure kitchen staff accounts and access credentials
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-brand-green hover:bg-brand-green-hover text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Chef</span>
          </button>
        </div>

        {/* Chefs List / Table Card */}
        <div className="bg-white rounded-3xl border border-brand-beige-dark shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-brand-beige-dark flex items-center justify-between bg-brand-beige/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-green/70" />
              <h2 className="font-extrabold text-sm text-brand-green">Registered Chefs</h2>
            </div>
            <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-full border border-brand-beige-dark text-brand-green">
              {chefs.length} {chefs.length === 1 ? 'Chef' : 'Chefs'}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-brand-green/60 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading kitchen staff...</span>
            </div>
          ) : chefs.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-3xl bg-brand-beige flex items-center justify-center mx-auto mb-4 border border-brand-gold/40 text-2xl">
                👨‍🍳
              </div>
              <h3 className="text-base font-extrabold text-brand-green mb-1">No Chefs Found</h3>
              <p className="text-xs text-brand-green/60 max-w-sm mx-auto mb-6">
                Get started by adding your first kitchen staff member to grant access to the kitchen display.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-hover transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Chef
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-beige-dark bg-brand-beige-light/60 text-[11px] font-bold text-brand-green/70 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Chef</th>
                    <th className="px-5 py-3.5">Email Address</th>
                    <th className="px-5 py-3.5">Contact Number</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-beige-dark/40 font-medium">
                  {chefs.map((chef) => (
                    <tr
                      key={chef.id}
                      className="hover:bg-brand-beige-light/40 transition-colors"
                    >
                      {/* Name - Plain static text, non-clickable, no edit icon on hover */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand-beige flex items-center justify-center text-base border border-brand-gold shrink-0 shadow-2xs">
                            👨‍🍳
                          </div>
                          <div>
                            <span className="font-extrabold text-sm text-brand-green block">
                              {chef.name}
                            </span>
                            <span className="text-[10px] text-brand-green/50 block font-mono">
                              ID: {chef.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-4 text-brand-green/80 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-brand-green/40 shrink-0" />
                          <span>{chef.email}</span>
                        </div>
                      </td>

                      {/* Contact Number */}
                      <td className="px-5 py-4 text-brand-green/80 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-brand-green/40 shrink-0" />
                          <span>{chef.contactNumber || chef.contact_number || '—'}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider border bg-brand-gold/20 text-brand-green border-brand-gold/40">
                          <Shield className="w-3 h-3" />
                          <span>{chef.role || 'CHEF'}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        {chef.is_active !== false ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(chef)}
                            className="p-1.5 rounded-lg hover:bg-brand-beige text-brand-green/60 hover:text-brand-green transition-colors cursor-pointer"
                            title="Edit Chef Details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChefToDelete(chef);
                              setDeleteError(null);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                            title="Delete Chef"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ADD NEW CHEF MODAL */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-brand-green/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-brand-beige-dark shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-brand-beige-dark flex items-center justify-between bg-brand-beige/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-green rounded-xl text-white shadow-xs">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-brand-green">Add New Chef</h3>
                  <p className="text-xs text-brand-green/60">Create credentials for kitchen staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-brand-beige text-brand-green/50 hover:text-brand-green transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {addError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{addError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddChef} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-bold text-brand-green flex items-center gap-1">
                  <span>Full Name</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chef"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  disabled={isAdding}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green placeholder:text-brand-green/30"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-bold text-brand-green flex items-center gap-1">
                  <span>Email Address</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="chef@vaanvibes.in"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  disabled={isAdding}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green placeholder:text-brand-green/30"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-brand-green flex items-center gap-1">
                    <span>Contact Number</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-brand-green/60 font-mono">Min. 10 digits</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  placeholder="10-digit mobile number"
                  value={addContact}
                  onChange={(e) => setAddContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isAdding}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green placeholder:text-brand-green/30"
                />
              </div>

              {/* Role Dropdown - strictly Chef */}
              <div className="space-y-1">
                <label className="font-bold text-brand-green flex items-center gap-1">
                  <span>Role</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={addRole}
                  onChange={(val) => setAddRole(val as UserRole)}
                  disabled={isAdding}
                  options={[
                    { value: 'CHEF', label: 'CHEF (Kitchen Staff Access)' },
                  ]}
                />
              </div>

              {/* Password with strong validation */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-brand-green flex items-center gap-1">
                    <span>Password</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-brand-green/60 font-mono">Min. 6 chars</span>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  disabled={isAdding}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green"
                />
                <p className="text-[10px] text-brand-green/60 leading-relaxed">
                  Must contain uppercase, lowercase, number, and special character.
                </p>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-beige-dark mt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAdding}
                  className="px-4 py-2.5 rounded-xl border border-brand-beige-dark font-bold text-brand-green/70 hover:bg-brand-beige transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Chef</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* EDIT CHEF MODAL (Directly opened on Edit button click) */}
      {/* ============================================================== */}
      {isEditModalOpen && editingChef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-brand-green/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-brand-beige-dark shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-brand-beige-dark flex items-center justify-between bg-brand-beige/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-gold/30 rounded-xl text-brand-green shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-brand-green">Edit Chef Details</h3>
                  <p className="text-xs text-brand-green/60 font-mono">ID: {editingChef.id.substring(0, 12)}...</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingChef(null);
                }}
                className="p-1.5 rounded-xl hover:bg-brand-beige text-brand-green/50 hover:text-brand-green transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {editError && (
              <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{editError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveEditChef} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-bold text-brand-green flex items-center gap-1">
                  <span>Full Name</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-bold text-brand-green flex items-center gap-1">
                  <span>Email Address</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={isSavingEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-brand-green flex items-center gap-1">
                    <span>Contact Number</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-brand-green/60 font-mono">Min. 10 digits</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  placeholder="10-digit mobile number"
                  value={editContact}
                  onChange={(e) => setEditContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  disabled={isSavingEdit}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark focus:outline-none focus:ring-2 focus:ring-brand-green/20 bg-white font-medium text-brand-green"
                />
              </div>

              {/* Role Dropdown - strictly Chef */}
              <div className="space-y-1">
                <label className="font-bold text-brand-green flex items-center gap-1">
                  <span>Role</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <CustomSelect
                  value={editRole}
                  onChange={(val) => setEditRole(val as UserRole)}
                  disabled={isSavingEdit}
                  options={[
                    { value: 'CHEF', label: 'CHEF (Kitchen Staff Access)' },
                  ]}
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-brand-beige-light/40 border border-brand-beige-dark">
                <div>
                  <span className="font-bold text-brand-green text-xs block">Account Status</span>
                  <span className="text-[11px] text-brand-green/60">
                    {editIsActive ? 'Active and allowed to log in' : 'Disabled from logging in'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditIsActive(!editIsActive)}
                  disabled={isSavingEdit}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    editIsActive ? 'bg-brand-green' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      editIsActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-beige-dark mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingChef(null);
                  }}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl border border-brand-beige-dark font-bold text-brand-green/70 hover:bg-brand-beige transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================================== */}
      {chefToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-brand-green/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl border border-brand-beige-dark shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-brand-green">Delete Chef Account</h3>
                <p className="text-xs text-brand-green/60">This action cannot be undone.</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-brand-green/80 leading-relaxed">
              Are you sure you want to permanently remove{' '}
              <span className="font-black text-brand-green">{chefToDelete.name}</span> (
              <span className="font-mono">{chefToDelete.email}</span>)? They will immediately lose access to the
              kitchen system.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setChefToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-brand-beige-dark font-bold text-xs text-brand-green/70 hover:bg-brand-beige transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteChef}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
