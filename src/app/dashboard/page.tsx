'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { BillModal } from '@/components/billing/BillModal';
import { CustomSelect } from '@/components/common/CustomSelect';
import { Order, OrderStatus, TableInfo } from '@/types/cafe';
import { ordersApi } from '@/api/orders';
import { tablesApi } from '@/api/tables';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  TrendingUp,
  Clock,
  ChefHat,
  Users,
  Search,
  Filter,
  Calendar,
} from 'lucide-react';

export type DateRangeOption = 'today' | 'yesterday' | '30_days' | 'month' | 'year';

const DATE_RANGE_OPTIONS: { label: string; value: DateRangeOption }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 30 Days', value: '30_days' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillOrderId, setSelectedBillOrderId] = useState<string | null>(null);
  const [selectedBillSessionId, setSelectedBillSessionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');

  const loadData = useCallback(async (rangeToFetch: DateRangeOption = dateRange) => {
    try {
      const [fetchedOrders, fetchedTables] = await Promise.all([
        ordersApi.getOrders({ range: rangeToFetch }).catch(() => []),
        tablesApi.getTables().catch(() => []),
      ]);
      setOrders(fetchedOrders);
      setTables(fetchedTables);
    } catch {
      // ignore
    }
  }, [dateRange]);

  useEffect(() => {
    loadData(dateRange);

    // Real-time WebSocket event listeners (silent background updates)
    const handleNewOrder = (newOrder: Order) => {
      // If filtering for yesterday, do not add new orders placed now
      if (dateRange === 'yesterday') return;
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    };
    const unsubPlaced = wsManager.on('ORDER_PLACED', handleNewOrder);
    const unsubCreated = wsManager.on('ORDER_CREATED', handleNewOrder);

    const handleStatusTransition = (data: {
      orderId?: string;
      order_id?: string;
      status: OrderStatus;
      updatedAt?: string;
      updated_at?: string;
    }) => {
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

    const unsubPay = wsManager.on('PAYMENT_SETTLED', (data: { orderId: string }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, paymentStatus: 'PAID' } : o))
      );
    });

    const unsubTbl = wsManager.on('TABLE_STATUS_UPDATED', (data: { tableId: string; status: any }) => {
      setTables((prev) =>
        prev.map((t) => (t.id === data.tableId ? { ...t, status: data.status } : t))
      );
    });

    const interval = setInterval(() => {
      loadData(dateRange);
    }, 8000);

    return () => {
      clearInterval(interval);
      unsubPlaced();
      unsubCreated();
      unsubAccepted();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
      unsubPay();
      unsubTbl();
    };
  }, [dateRange, loadData]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      if (nextStatus === 'ACCEPTED') {
        await ordersApi.acceptOrder(orderId);
      } else if (nextStatus === 'COMPLETED') {
        await ordersApi.completeOrder(orderId);
      } else {
        await ordersApi.updateStatus(orderId, nextStatus);
      }
    } catch (err) {
      console.error('Failed to update status on backend:', err);
      throw err;
    }
    loadData(dateRange);
  };

  // KPIs calculated live from filtered state
  const totalOrders = orders.length;
  const kitchenPending = orders.filter((o) =>
    ['PLACED', 'ORDER_PLACED', 'ACCEPTED'].includes(o.status)
  ).length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const paidRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    if (activeFilter !== 'ALL') {
      if (activeFilter === 'PLACED') {
        if (order.status !== 'PLACED' && order.status !== 'ORDER_PLACED') return false;
      } else if (order.status !== activeFilter) {
        return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerMobile && order.customerMobile.includes(q)) ||
      (order.tableNumber && `table ${order.tableNumber}`.includes(q)) ||
      (order.items && order.items.some((i) => i.name.toLowerCase().includes(q)))
    );
  });

  const getRangeLabel = () => {
    const match = DATE_RANGE_OPTIONS.find((opt) => opt.value === dateRange);
    return match ? match.label : 'Today';
  };

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight font-serif">
              Operations Dashboard
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Live floor overview, active orders, revenue settlement, and table management.
            </p>
          </div>

          {/* Date Filter Dropdown */}
          <div className="flex items-center gap-2">
            <CustomSelect
              value={dateRange}
              onChange={(val) => setDateRange(val as DateRangeOption)}
              options={DATE_RANGE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              icon={<Calendar className="w-3.5 h-3.5 text-brand-green/60 shrink-0" />}
              className="w-44"
              buttonClassName="py-2 px-3 shadow-2xs"
              ariaLabel="Select Date Range"
            />
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
            <p className="text-[11px] text-brand-green/60">{getRangeLabel()} tickets</p>
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
            <p className="text-[11px] text-amber-900/60">Requires preparation</p>
          </div>

          {/* Occupied Tables */}
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] uppercase font-black tracking-wider">Occupied Tables</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              {occupiedTables} / {tables.length || 12}
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
            <p className="text-[11px] text-brand-green/60">{getRangeLabel()} verified</p>
          </div>
        </div>

        {/* Filter Pills & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(
              [
                { label: 'All Orders', value: 'ALL' },
                { label: 'Placed', value: 'PLACED' },
                { label: 'Accepted', value: 'ACCEPTED' },
                { label: 'Completed', value: 'COMPLETED' },
                { label: 'Cancelled', value: 'CANCELLED' },
              ] as const
            ).map((tab) => {
              const count =
                tab.value === 'ALL'
                  ? orders.length
                  : tab.value === 'PLACED'
                  ? orders.filter((o) => o.status === 'PLACED' || o.status === 'ORDER_PLACED').length
                  : orders.filter((o) => o.status === tab.value).length;
              const isActive = activeFilter === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveFilter(tab.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-brand-green text-brand-beige shadow-xs'
                      : 'bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-brand-beige text-brand-green' : 'bg-brand-beige-light text-brand-green/70'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-brand-green/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ID, customer, table, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </div>
        </div>

        {/* Live Orders Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-brand-green">
              Live Orders ({filteredOrders.length})
            </h2>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-brand-beige-dark text-center space-y-2">
              <Filter className="w-8 h-8 text-brand-green/30 mx-auto" />
              <p className="text-xs font-bold text-brand-green/60">No orders match the current filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenBill={(id) => {
                    const ord = orders.find((o) => o.id === id);
                    if (ord?.diningSessionId) {
                      setSelectedBillSessionId(ord.diningSessionId);
                      setSelectedBillOrderId(null);
                    } else {
                      setSelectedBillOrderId(id);
                      setSelectedBillSessionId(null);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bill Modal */}
      <BillModal
        orderId={selectedBillOrderId}
        sessionId={selectedBillSessionId}
        onClose={() => {
          setSelectedBillOrderId(null);
          setSelectedBillSessionId(null);
        }}
        onSettled={() => {
          loadData(dateRange);
        }}
      />
    </AppLayout>
  );
}
