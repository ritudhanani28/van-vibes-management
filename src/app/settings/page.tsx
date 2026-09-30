'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Store, Clock, Save, Check } from 'lucide-react';

export default function CafeSettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
            Cafe Operational Settings
          </h1>
          <p className="text-xs text-brand-green/70 mt-0.5">
            Configure cafe branding, ordering parameters, and kitchen display options.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-brand-beige-dark p-5 sm:p-6 shadow-xs space-y-5">
          <div className="space-y-4">
            <h2 className="font-extrabold text-sm text-brand-green border-b border-brand-beige-dark/50 pb-2 flex items-center gap-2">
              <Store className="w-4 h-4 text-brand-gold" />
              <span>Cafe Identity & Billing Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-brand-green">Cafe Legal Name</label>
                <input
                  type="text"
                  defaultValue="Vaan Vibes Cafe & Restro"
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-brand-green">Currency Symbol</label>
                <input
                  type="text"
                  defaultValue="₹ (INR)"
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-3">
            <h2 className="font-extrabold text-sm text-brand-green border-b border-brand-beige-dark/50 pb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-gold" />
              <span>Kitchen & KDS Configuration</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-brand-green">KDS Auto-Refresh Interval</label>
                <select className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs bg-white">
                  <option value="5">Every 5 seconds</option>
                  <option value="10">Every 10 seconds</option>
                  <option value="15">Every 15 seconds</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-brand-green">Order Alert Sound</label>
                <select className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs bg-white">
                  <option value="chime">Subtle Dining Chime (Default)</option>
                  <option value="bell">Kitchen Bell</option>
                  <option value="silent">Silent</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between border-t border-brand-beige-dark/50">
            {saved && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Settings updated successfully
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <Save className="w-3.5 h-3.5 text-brand-gold" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
