'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { BillModal } from '@/components/billing/BillModal';
import { Order, OrderStatus, TableInfo } from '@/types/cafe';
import { CafeStore } from '@/lib/cafe-store';
import {
  Clock,
  ChefHat,
  Users,
  DollarSign,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  QrCode,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillOrderId, setSelectedBillOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setIsRefreshing(true);
    try {
      const allOrders = CafeStore.getAllOrders();
      const allTables = CafeStore.getAllTables();
      setOrders([...allOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setTables(allTables);
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll updates every 6 seconds
    const interval = setInterval(loadData, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    CafeStore.updateOrderStatus(orderId, nextStatus);
    loadData();
  };

  // KPIs
  const totalOrders = orders.length;
  const kitchenPending = orders.filter((o) =>
    ['ORDER_PLACED', 'ACCEPTED', 'PREPARING'].includes(o.status)
  ).length;
  const occupiedTables = new Set(
    orders
      .filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status))
      .map((o) => o.tableId)
  ).size;
  const paidRevenue = orders
    .filter((o) => o.status === 'COMPLETED' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.total, 0);

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesFilter = activeFilter === 'ALL' || order.status === activeFilter;
    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerMobile && order.customerMobile.includes(q)) ||
      order.tableNumber.toString().includes(q) ||
      order.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              Admin Operations Dashboard
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Live floor overview, kitchen queue, revenue settlement, and table management.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-brand-beige border border-brand-beige-dark text-xs font-bold text-brand-green shadow-2xs transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              href="/chef"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold shadow-xs transition-all active:scale-95"
            >
              <ChefHat className="w-3.5 h-3.5 text-brand-gold" />
              <span>Open Kitchen KDS</span>
            </Link>
          </div>
        </div>

        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Orders */}
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-brand-green/60">
              <span className="text-[10px] uppercase font-black tracking-wider">Total Orders</span>
              <Clock className="w-4 h-4 text-brand-green/40" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
              {totalOrders}
            </p>
            <p className="text-[11px] text-brand-green/60">Recorded session orders</p>
          </div>

          {/* Kitchen Pending */}
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] uppercase font-black tracking-wider">Kitchen Pending</span>
              <ChefHat className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
              {kitchenPending}
            </p>
            <p className="text-[11px] text-amber-900/60">Requires prep or service</p>
          </div>

          {/* Occupied Tables */}
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] uppercase font-black tracking-wider">Occupied Tables</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              {occupiedTables} / {tables.length}
            </p>
            <p className="text-[11px] text-emerald-900/60">Dine-in tables active</p>
          </div>

          {/* Paid Revenue */}
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-brand-gold-dark">
              <span className="text-[10px] uppercase font-black tracking-wider">Settled Revenue</span>
              <TrendingUp className="w-4 h-4 text-brand-gold" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
              ₹{paidRevenue.toFixed(0)}
            </p>
            <p className="text-[11px] text-brand-green/60">Completed customer bills</p>
          </div>
        </div>

        {/* Live Orders Section */}
        <div className="bg-white rounded-2xl border border-brand-beige-dark p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-brand-beige-dark/50 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-brand-green">
                Live Orders Feed ({filteredOrders.length})
              </h2>
              <p className="text-xs text-brand-green/60">
                Track incoming requests and advance kitchen status
              </p>
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer, table..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[36px]"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {(
              [
                ['ALL', 'All Orders'],
                ['ORDER_PLACED', 'Placed'],
                ['ACCEPTED', 'Accepted'],
                ['PREPARING', 'Preparing'],
                ['READY', 'Ready'],
                ['COMPLETED', 'Completed'],
                ['CANCELLED', 'Cancelled'],
              ] as const
            ).map(([status, label]) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  activeFilter === status
                    ? 'bg-brand-green text-brand-beige shadow-xs'
                    : 'bg-brand-beige-light hover:bg-brand-beige text-brand-green border border-brand-beige-dark'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Orders Cards Grid */}
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-xs text-brand-green/60 space-y-1">
              <p className="font-bold text-sm text-brand-green">No orders found</p>
              <p>There are no orders matching the selected filter or search keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenBill={(id) => setSelectedBillOrderId(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Tables Overview */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm sm:text-base text-brand-green">
                Table QR Status Overview (12 Tables)
              </h3>
              <p className="text-xs text-brand-green/60">
                Green dot indicates active customer order on table
              </p>
            </div>
            <Link
              href="/tables"
              className="text-xs font-bold text-brand-green hover:underline flex items-center gap-1"
            >
              <span>Manage Standees</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {tables.map((t) => {
              const hasActiveOrder = orders.some(
                (o) => o.tableId === t.id && !['COMPLETED', 'CANCELLED'].includes(o.status)
              );
              return (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
                    hasActiveOrder
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-brand-beige-light border-brand-beige-dark text-brand-green'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasActiveOrder ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                      }`}
                    />
                    <span className="font-black text-xs font-mono">
                      T-{t.tableNumber.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] text-brand-green/60 mt-0.5">
                    {hasActiveOrder ? 'Occupied' : 'Vacant'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bill Receipt Modal */}
      {selectedBillOrderId && (
        <BillModal
          orderId={selectedBillOrderId}
          onClose={() => setSelectedBillOrderId(null)}
        />
      )}
    </AppLayout>
  );
}
