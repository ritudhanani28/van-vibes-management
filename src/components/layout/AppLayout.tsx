'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AccessDenied } from '@/components/common/AccessDenied';
import {
  LayoutDashboard,
  ChefHat,
  ShoppingBag,
  Receipt,
  QrCode,
  Settings,
  UserCheck,
  LogOut,
  Menu as MenuIcon,
  X,
  UtensilsCrossed,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('ADMIN' | 'CHEF')[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Admin Navigation
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN'],
  },
  // Chef Primary KDS
  {
    name: 'Kitchen KDS',
    href: '/chef',
    icon: ChefHat,
    roles: ['CHEF', 'ADMIN'],
    badge: 'Live',
  },
  // Orders Management (Both)
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingBag,
    roles: ['ADMIN', 'CHEF'],
  },
  // Billing & Settlement (Admin Only)
  {
    name: 'Billing & POS',
    href: '/billing',
    icon: Receipt,
    roles: ['ADMIN'],
  },
  // Tables & QR (Admin Only)
  {
    name: 'Table QR Standees',
    href: '/tables',
    icon: QrCode,
    roles: ['ADMIN'],
  },
  // Menu Administration (Admin Only)
  {
    name: 'Menu Catalog',
    href: '/menu-items',
    icon: UtensilsCrossed,
    roles: ['ADMIN'],
  },
  // Settings (Admin Only)
  {
    name: 'Cafe Settings',
    href: '/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
  // Profile (Both)
  {
    name: 'My Profile',
    href: '/profile',
    icon: UserCheck,
    roles: ['ADMIN', 'CHEF'],
  },
];

export function AppLayout({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'CHEF';
}) {
  const { user, role, logout, canAccess, isLoading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-beige-light flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
      </div>
    );
  }

  // Route protection
  if (requiredRole && !canAccess(requiredRole)) {
    return (
      <div className="min-h-screen bg-brand-beige-light flex flex-col font-sans">
        <div className="p-4 border-b border-brand-beige-dark bg-white flex items-center justify-between">
          <span className="font-black text-brand-green">Vaan Vibes Management</span>
          <button
            onClick={logout}
            className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
        <AccessDenied featureName={pathname} />
      </div>
    );
  }

  const authorizedNavItems = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <div className="min-h-screen bg-brand-beige-light flex flex-col md:flex-row font-sans text-brand-green">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-brand-green text-brand-beige border-b border-brand-green-light px-3.5 py-2.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 rounded-xl bg-brand-green-light hover:bg-brand-green-surface flex items-center justify-center text-brand-beige transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-xs border border-brand-gold">
              व
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-brand-beige">
                वन VIBES
              </span>
              <span className="ml-1.5 text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-brand-gold text-brand-green">
                {user?.role || 'Staff'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-brand-green-light text-sm flex items-center justify-center"
            title={user?.name}
          >
            {user?.avatar || '👤'}
          </Link>
          <button
            onClick={logout}
            className="w-8 h-8 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 flex items-center justify-center transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-brand-green text-brand-beige flex flex-col md:hidden shadow-2xl animate-in slide-in-from-left duration-250">
            <div className="p-4 border-b border-brand-green-light flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-sm border border-brand-gold">
                  व
                </div>
                <div>
                  <p className="font-black text-base leading-tight">वन VIBES</p>
                  <p className="text-[10px] text-brand-beige-muted uppercase tracking-wider font-semibold">
                    Management Console
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg bg-brand-green-light flex items-center justify-center text-brand-beige"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-3.5 m-3 rounded-xl bg-brand-green-surface border border-brand-gold/30">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{user?.avatar || '👤'}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-brand-beige truncate">{user?.name}</p>
                  <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-brand-gold text-brand-green font-mono">
                    {user?.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {authorizedNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
                      isActive
                        ? 'bg-brand-gold text-brand-green shadow-xs'
                        : 'text-brand-beige/80 hover:bg-brand-green-light hover:text-brand-beige'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-brand-green-light text-brand-gold font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 border-t border-brand-green-light">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-950/70 hover:bg-red-900 text-red-200 font-bold text-xs transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Desktop Sticky Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-brand-green text-brand-beige flex-col shrink-0 min-h-screen border-r border-brand-green-light sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="p-5 border-b border-brand-green-light flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-lg border border-brand-gold shadow-xs shrink-0">
            व
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-brand-beige">
                वन VIBES
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-brand-gold text-brand-green tracking-wider">
                Console
              </span>
            </div>
            <p className="text-[10px] text-brand-beige-muted uppercase tracking-wider font-semibold">
              Admin & Chef Operations
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 mx-4 mt-4 rounded-2xl bg-brand-green-surface/90 border border-brand-gold/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">{user?.avatar || '👤'}</span>
            <div className="min-w-0">
              <p className="font-extrabold text-xs text-brand-beige truncate">{user?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] uppercase font-bold tracking-wider text-brand-gold font-mono">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-brand-beige/40 px-2 pb-1">
            {role === 'ADMIN' ? 'General Management' : 'Kitchen Operations'}
          </div>
          {authorizedNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-brand-gold text-brand-green shadow-xs scale-102'
                    : 'text-brand-beige/80 hover:bg-brand-green-light hover:text-brand-beige'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
                {item.badge ? (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-brand-green-light text-brand-gold font-bold">
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions: Sign Out */}
        <div className="p-4 border-t border-brand-green-light">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-200 font-bold text-xs transition-all active:scale-98"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-3 sm:p-5 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
