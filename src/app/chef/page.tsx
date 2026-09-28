'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { Order, OrderStatus } from '@/types/cafe';
import { CafeStore } from '@/lib/cafe-store';
import {
  ChefHat,
  Bell,
  BellOff,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function ChefKDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = useCallback(() => {
    setIsRefreshing(true);
    try {
      const all = CafeStore.getAllOrders();
      setOrders([...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    CafeStore.updateOrderStatus(orderId, nextStatus);
    loadOrders();
  };

  // Group kitchen orders into 3 primary stages
  const newIncoming = orders.filter((o) => o.status === 'ORDER_PLACED');
  const inKitchen = orders.filter((o) =>
    ['ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
  );
  const completedToday = orders.filter((o) =>
    ['COMPLETED', 'SERVED'].includes(o.status)
  );

  return (
    <AppLayout requiredRole="CHEF">
      <div className="space-y-6">
        {/* Chef KDS Header Strip */}
        <div className="p-4 sm:p-5 rounded-2xl bg-brand-green text-brand-beige shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gold text-brand-green font-black flex items-center justify-center text-lg shadow-sm">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-brand-beige">
                  Kitchen Display System (KDS)
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-brand-gold text-brand-green">
                  Live Prep
                </span>
              </div>
              <p className="text-xs text-brand-beige-muted mt-0.5">
                Real-time tickets, preparation line, and rapid dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                chimeEnabled
                  ? 'bg-brand-green-surface text-brand-gold border-brand-gold/40'
                  : 'bg-brand-green-light text-brand-beige/60 border-transparent'
              }`}
            >
              {chimeEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{chimeEnabled ? 'Chime ON' : 'Chime OFF'}</span>
            </button>

            <button
              type="button"
              onClick={loadOrders}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-brand-green-light hover:bg-brand-green-surface text-brand-beige transition-colors disabled:opacity-50"
              title="Refresh Tickets"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3-Stage Kitchen Stage Counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Stage 1: New Incoming */}
          <div className="p-4 rounded-2xl bg-white border-2 border-amber-300 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-900">
              <span className="text-[10px] uppercase font-black tracking-wider">
                1. Order Placed (New)
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-black text-amber-700 font-mono">
              {newIncoming.length}
            </p>
            <p className="text-[11px] text-amber-900/60">Awaiting kitchen acceptance</p>
          </div>

          {/* Stage 2: In Kitchen */}
          <div className="p-4 rounded-2xl bg-white border-2 border-blue-300 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-blue-900">
              <span className="text-[10px] uppercase font-black tracking-wider">
                2. Order Accepted (Kitchen)
              </span>
              <ChefHat className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-3xl font-black text-blue-700 font-mono">
              {inKitchen.length}
            </p>
            <p className="text-[11px] text-blue-900/60">Under active preparation</p>
          </div>

          {/* Stage 3: Completed */}
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-300 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-900">
              <span className="text-[10px] uppercase font-black tracking-wider">
                3. Completed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-black text-emerald-700 font-mono">
              {completedToday.length}
            </p>
            <p className="text-[11px] text-emerald-900/60">Dispatched & served to tables</p>
          </div>
        </div>

        {/* Section 1: Incoming Orders (High Priority) */}
        {newIncoming.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-amber-300">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
              <h2 className="font-black text-base text-amber-950 uppercase tracking-wide">
                New Incoming ({newIncoming.length}) — Action Required
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {newIncoming.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  isKitchenView
                />
              ))}
            </div>
          </section>
        )}

        {/* Section 2: Active Preparation Line */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-brand-beige-dark/70">
            <ChefHat className="w-4 h-4 text-brand-gold" />
            <h2 className="font-black text-base text-brand-green uppercase tracking-wide">
              Active Kitchen Preparation ({inKitchen.length})
            </h2>
          </div>
          {inKitchen.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-brand-beige-dark text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-brand-green">Kitchen Line Clear</p>
              <p className="text-xs text-brand-green/60">
                All accepted tickets are prepared and served!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {inKitchen.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  isKitchenView
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Recent Dispatched & Completed */}
        {completedToday.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-brand-beige-dark/70">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="font-black text-base text-brand-green uppercase tracking-wide">
                Recently Completed Today ({completedToday.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {completedToday.slice(0, 4).map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  isKitchenView
                />
              ))}
            </div>
          </section>
        )}
      </div>

    </AppLayout>
  );
}
