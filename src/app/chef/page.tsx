'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { Order, OrderStatus } from '@/types/cafe';
import { ordersApi } from '@/api/orders';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  ChefHat,
  Bell,
  BellOff,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Send,
  Flame,
} from 'lucide-react';

export default function ChefKDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'completed'>('live');

  const playKitchenChime = useCallback(() => {
    if (!chimeEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, [chimeEnabled]);

  const loadOrders = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const all = await ordersApi.getOrders();
      setOrders(all);
    } catch (err) {
      console.error('Failed to load orders for Chef KDS:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    const handleNewOrder = (newOrder: Order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      playKitchenChime();
    };

    const unsubPlaced = wsManager.on('ORDER_PLACED', handleNewOrder);
    const unsubCreated = wsManager.on('ORDER_CREATED', handleNewOrder);

    const handleStatusTransition = (data: { orderId?: string; order_id?: string; status: OrderStatus; updatedAt?: string; updated_at?: string }) => {
      const id = data.orderId || data.order_id;
      const st = data.status;
      const upd = data.updatedAt || data.updated_at || new Date().toISOString();
      if (!id) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: st, updatedAt: upd } : o))
      );
    };

    const unsubAccepted = wsManager.on('ORDER_ACCEPTED', handleStatusTransition);
    const unsubServed = wsManager.on('ORDER_SERVED', handleStatusTransition);
    const unsubCompleted = wsManager.on('ORDER_COMPLETED', handleStatusTransition);
    const unsubUpdated = wsManager.on('ORDER_STATUS_UPDATED', handleStatusTransition);

    const interval = setInterval(loadOrders, 10000);
    return () => {
      clearInterval(interval);
      unsubPlaced();
      unsubCreated();
      unsubAccepted();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
    };
  }, [loadOrders, playKitchenChime]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      if (nextStatus === 'ACCEPTED') {
        await ordersApi.acceptOrder(orderId);
      } else if (nextStatus === 'COMPLETED' || nextStatus === 'SERVED') {
        await ordersApi.completeOrder(orderId);
      } else {
        await ordersApi.updateStatus(orderId, nextStatus);
      }
    } catch (err) {
      console.error('Failed to update status on backend:', err);
    }
    loadOrders();
  };

  // Group kitchen orders into sequential stages
  const placedOrders = orders.filter((o) => o.status === 'PLACED' || o.status === 'ORDER_PLACED');
  const acceptedOrders = orders.filter((o) => o.status === 'ACCEPTED' || o.status === 'SERVED');
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

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
                Real-time tickets, preparation line, and table delivery (Sanitized Operational View — No Pricing)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                chimeEnabled
                  ? 'bg-brand-gold text-brand-green'
                  : 'bg-brand-green-light text-brand-beige'
              }`}
            >
              {chimeEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{chimeEnabled ? 'Order Sound ON' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={loadOrders}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-green-light hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* View Switcher: Live Active Pipeline vs Completed History */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-brand-green text-brand-beige shadow-xs'
                : 'bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark'
            }`}
          >
            Live Kitchen Pipeline ({placedOrders.length + acceptedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-brand-green text-brand-beige shadow-xs'
                : 'bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark'
            }`}
          >
            Completed Tickets ({completedOrders.length})
          </button>
        </div>

        {activeTab === 'live' ? (
          /* 2 Stage Columns: PLACED -> ACCEPTED (Ready to Complete) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* STAGE 1: Placed (Incoming) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-brand-green">
                    1. Placed (Incoming)
                  </h2>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono">
                  {placedOrders.length}
                </span>
              </div>

              {placedOrders.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-brand-beige-dark text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-amber-500/40 mx-auto" />
                  <p className="text-xs font-bold text-brand-green/60">No pending incoming orders</p>
                  <p className="text-[11px] text-brand-green/40">New customer orders will ring here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {placedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      isKitchenView={true}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* STAGE 2: Accepted (Cooking / In Kitchen -> Complete Order) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-blue-500">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-blue-600" />
                  <h2 className="font-extrabold text-sm uppercase tracking-wider text-brand-green">
                    2. Accepted (In Kitchen)
                  </h2>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 font-mono">
                  {acceptedOrders.length}
                </span>
              </div>

              {acceptedOrders.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-brand-beige-dark text-center space-y-2">
                  <Clock className="w-8 h-8 text-blue-500/40 mx-auto" />
                  <p className="text-xs font-bold text-brand-green/60">No orders currently cooking</p>
                  <p className="text-[11px] text-brand-green/40">Accept incoming orders to begin preparation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      isKitchenView={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Completed Orders View */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-brand-green">
                  Completed Orders ({completedOrders.length})
                </h2>
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-2">
                <Clock className="w-8 h-8 text-brand-green/30 mx-auto" />
                <p className="text-xs font-bold text-brand-green/60">No completed tickets yet today</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {completedOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateStatus}
                    isKitchenView={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
