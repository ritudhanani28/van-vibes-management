'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { ordersApi } from '@/api/orders';
import { Order, OrderStatus } from '@/types/cafe';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  ChefHat,
  CheckCircle2,
  Clock,
  Bell,
  BellOff,
  Sparkles,
  Calendar,
  ChevronDown,
  Check,
} from 'lucide-react';

type DateFilterOption = {
  label: string;
  value: 'today' | 'yesterday' | 'this_month' | 'this_year';
};

const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Month', value: 'this_month' },
  { label: 'This Year', value: 'this_year' },
];

export default function ChefKDSPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'completed'>('live');
  const [chimeEnabled, setChimeEnabled] = useState(true);

  // Date Filter State
  const [selectedFilter, setSelectedFilter] = useState<'today' | 'yesterday' | 'this_month' | 'this_year'>('today');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Web Audio Kitchen chime for incoming orders
  const playKitchenChime = useCallback(() => {
    if (!chimeEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15);
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

  // Load orders filtered by date range on the backend
  const loadOrders = useCallback(async () => {
    try {
      const filtered = await ordersApi.getOrders({ range: selectedFilter });
      setOrders(filtered);
    } catch (err) {
      console.error('Failed to load orders for Chef KDS:', err);
    }
  }, [selectedFilter]);

  useEffect(() => {
    let active = true;
    ordersApi.getOrders({ range: selectedFilter }).then((filtered) => {
      if (active) setOrders(filtered);
    }).catch((err) => {
      console.error('Failed to load orders for Chef KDS:', err);
    });

    // Order accepted by Admin -> appears as Incoming Order for Chef
    const handleOrderAccepted = (acceptedOrder: { orderId?: string; id?: string }) => {
      const orderId = acceptedOrder?.orderId || acceptedOrder?.id;
      if (!orderId) return;
      loadOrders();
      playKitchenChime();
    };

    const unsubAccepted = wsManager.on('ORDER_ACCEPTED', handleOrderAccepted);

    // Order status transitions (IN_KITCHEN, COMPLETED, etc.)
    const handleStatusTransition = (data: { orderId?: string; order_id?: string; status: OrderStatus; updatedAt?: string; updated_at?: string }) => {
      const id = data.orderId || data.order_id;
      const st = data.status;
      const upd = data.updatedAt || data.updated_at || new Date().toISOString();
      if (!id) return;
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: st, updatedAt: upd } : o))
      );
    };

    const unsubInKitchen = wsManager.on('ORDER_IN_KITCHEN', handleStatusTransition);
    const unsubServed = wsManager.on('ORDER_SERVED', handleStatusTransition);
    const unsubCompleted = wsManager.on('ORDER_COMPLETED', handleStatusTransition);
    const unsubUpdated = wsManager.on('ORDER_STATUS_UPDATED', handleStatusTransition);
    const unsubTransferred = wsManager.on('TABLE_TRANSFERRED', () => loadOrders());

    const interval = setInterval(loadOrders, 10000);
    return () => {
      active = false;
      clearInterval(interval);
      unsubAccepted();
      unsubInKitchen();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
      unsubTransferred();
    };
  }, [loadOrders, playKitchenChime, selectedFilter]);

  // Chef action: Only "Done" action allowed, moving from ACCEPTED to IN_KITCHEN
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      if (nextStatus === 'IN_KITCHEN') {
        await ordersApi.doneOrder(orderId);
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

  // Kitchen orders:
  // 1. Incoming Orders: Orders accepted by Admin (status === ACCEPTED) - chef prepares and clicks Done
  // 2. Completed / Prepared Orders: Orders marked Done or Completed
  const incomingOrders = orders.filter((o) => o.status === 'ACCEPTED');
  const completedOrders = orders.filter(
    (o) => o.status === 'COMPLETED' || o.status === 'IN_KITCHEN' || o.status === 'SERVED'
  );

  const currentFilterLabel = DATE_FILTER_OPTIONS.find((o) => o.value === selectedFilter)?.label || 'Today';

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
            {/* Custom Date Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-green-light hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all border border-brand-gold/30 cursor-pointer shadow-2xs"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                <span>{currentFilterLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-brand-gold transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-brand-beige-dark p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[9px] font-black uppercase tracking-wider text-brand-green/40 px-2 py-1">
                    Filter by Period
                  </div>
                  {DATE_FILTER_OPTIONS.map((option) => {
                    const isSelected = selectedFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedFilter(option.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-brand-green text-brand-beige'
                            : 'text-brand-green hover:bg-brand-beige-light'
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-gold" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                chimeEnabled
                  ? 'bg-brand-gold text-brand-green'
                  : 'bg-brand-green-light text-brand-beige'
              }`}
            >
              {chimeEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{chimeEnabled ? 'Sound ON' : 'Muted'}</span>
            </button>
          </div>
        </div>

        {/* View Switcher: Live Incoming Orders vs Completed History */}
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
            Live Kitchen Orders ({incomingOrders.length})
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
          /* Incoming Orders (Admin Accepted -> Chef prepares, clicks Done) */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-brand-green">
                  Incoming Orders
                </h2>
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono">
                {incomingOrders.length}
              </span>
            </div>

            {incomingOrders.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white border border-brand-beige-dark text-center space-y-2">
                <Sparkles className="w-10 h-10 text-amber-500/40 mx-auto" />
                <p className="text-sm font-bold text-brand-green/70">No pending incoming orders</p>
                <p className="text-xs text-brand-green/50">
                  Orders accepted by Admin will appear here for kitchen preparation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {incomingOrders.map((order) => (
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
                <p className="text-xs font-bold text-brand-green/60">No completed tickets found for selected period</p>
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
