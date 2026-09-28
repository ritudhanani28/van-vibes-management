'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft, ChefHat, LayoutDashboard } from 'lucide-react';

export function AccessDenied({ featureName = 'this section' }: { featureName?: string }) {
  const { user } = useAuth();
  const isChef = user?.role === 'CHEF';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
        Access Restricted
      </h1>
      <p className="text-xs sm:text-sm text-brand-green/70 max-w-md mt-2 leading-relaxed">
        You do not have administrative clearance to access {featureName}.
        {isChef && (
          <span className="block mt-1 text-brand-green/60">
            Kitchen staff permissions are focused on active order preparation and kitchen operations.
          </span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {isChef ? (
          <Link
            href="/chef"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
          >
            <ChefHat className="w-4 h-4 text-brand-gold" />
            <span>Return to Kitchen KDS</span>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4 text-brand-gold" />
            <span>Return to Admin Dashboard</span>
          </Link>
        )}
      </div>
    </div>
  );
}
