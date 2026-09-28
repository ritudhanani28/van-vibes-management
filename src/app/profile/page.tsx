'use client';

import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { UserCheck, Shield, Clock, MapPin, Mail, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
            Staff Profile & Credentials
          </h1>
          <p className="text-xs text-brand-green/70 mt-0.5">
            Active session verification and station assignments.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-brand-beige-dark p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-4 border-b border-brand-beige-dark/50 pb-5">
            <div className="w-16 h-16 rounded-full bg-brand-beige text-brand-green flex items-center justify-center text-3xl border border-brand-gold shadow-sm">
              {user?.avatar || '👤'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-brand-green">{user?.name}</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-gold text-brand-green font-mono">
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-brand-green/60 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider">
                Assigned Station
              </span>
              <p className="font-extrabold text-sm text-brand-green">
                {user?.assignedStation || 'General Floor'}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-brand-beige-light border border-brand-beige-dark space-y-1">
              <span className="text-[10px] uppercase font-bold text-brand-green/50 tracking-wider">
                Shift Schedule
              </span>
              <p className="font-extrabold text-sm text-brand-green">
                {user?.shift || 'Active Duty'}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              className="w-full py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 border border-red-200 transition-colors"
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
