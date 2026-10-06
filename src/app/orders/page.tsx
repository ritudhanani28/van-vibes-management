'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { BillModal } from '@/features/billing/components/BillModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Order, OrderStatus, ActivityFilterOption, isOrderActive, isOrderInactive } from '@/types/cafe';
import { ordersApi } from '@/api/orders';
import { canCompleteOrder } from '@/utils/kot';
import { wsManager } from '@/services/websocket/WebSocketManager';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  ShoppingBag,
  Activity,
  Loader2,
  AlertCircle,
  Filter,
  Calendar,
  Utensils,
  CreditCard,
  X,
  RotateCcw,
} from 'lucide-react';

export type DateFilterOption = 'ALL' | 'today' | 'yesterday' | '30_days' | 'month' | 'year';

const DATE_FILTER_OPTIONS: { label: string; value: DateFilterOption }[] = [
  { label: 'All Dates', value: 'ALL' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 30 Days', value: '30_days' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

export default function OrdersPage() {
  const { role } = useAuth();
  const isChef = role === 'CHEF';

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Activity filter: 'ACTIVE' (default), 'ALL', or 'INACTIVE'
  const [activityFilter, setActivityFilter] = useState<ActivityFilterOption>('ACTIVE');

  // Filters default to ALL (no selected filter initially)
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedBillOrderId, setSelectedBillOrderId] = useState<string | null>(null);
  const [selectedBillSessionId, setSelectedBillSessionId] = useState<string | null>(null);

  // Authoritative Activity Counts
  const activeCount = useMemo(() => orders.filter((o) => isOrderActive(o)).length, [orders]);
  const inactiveCount = useMemo(() => orders.filter((o) => isOrderInactive(o)).length, [orders]);
  const allCount = orders.length;

  const loadOrders = useCallback(async () => {
    try {
      setLoadError(null);
      const all = await ordersApi.getOrders();
      setOrders(all);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load orders. Please try again.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    ordersApi.getOrders().then((all) => {
      if (active) {
        setOrders(all);
        setLoadError(null);
      }
    }).catch((err) => {
      if (active) {
        const msg = err instanceof Error ? err.message : 'Unable to load orders. Please try again.';
        setLoadError(msg);
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    // Real-time: Listen for new orders
    const handleNewOrder = (newOrder: Order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    };
    const unsubPlaced = wsManager.on('ORDER_PLACED', handleNewOrder);
    const unsubCreated = wsManager.on('ORDER_CREATED', handleNewOrder);

    // Real-time: Listen for status transitions
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
        prev.map((o) => {
          if (o.id === id) {
            const updated = { ...o, status: st, updatedAt: upd };
            const active = isOrderActive(updated);
            return {
              ...updated,
              activityStatus: active ? 'ACTIVE' : 'INACTIVE',
              isActive: active,
            };
          }
          return o;
        })
      );
    };

    const unsubAccepted = wsManager.on('ORDER_ACCEPTED', handleStatusTransition);
    const unsubInKitchen = wsManager.on('ORDER_IN_KITCHEN', handleStatusTransition);
    const unsubServed = wsManager.on('ORDER_SERVED', handleStatusTransition);
    const unsubCompleted = wsManager.on('ORDER_COMPLETED', handleStatusTransition);
    const unsubUpdated = wsManager.on('ORDER_STATUS_UPDATED', handleStatusTransition);
    const unsubTransferred = wsManager.on('TABLE_TRANSFERRED', () => loadOrders());

    // Real-time: Listen for bill generation
    const handleBillGenerated = (data: {
      tableId?: string;
      table_id?: string;
      sessionId?: string;
      session_id?: string;
    }) => {
      const sessId = data?.sessionId || data?.session_id;
      const tblId = data?.tableId || data?.table_id;
      setOrders((prev) =>
        prev.map((o) => {
          if ((sessId && o.diningSessionId === sessId) || (tblId && o.tableId === tblId)) {
            const updated = {
              ...o,
              billGenerated: true,
              sessionStatus: 'BILL_GENERATED' as const,
            };
            const active = isOrderActive(updated);
            return {
              ...updated,
              activityStatus: active ? 'ACTIVE' : 'INACTIVE',
              isActive: active,
            };
          }
          return o;
        })
      );
    };
    const unsubBill = wsManager.on('BILL_GENERATED', handleBillGenerated);

    // Real-time: Listen for payment settlement
    const handlePaymentSettled = (data: {
      orderId?: string;
      order_id?: string;
      sessionId?: string;
      session_id?: string;
      tableId?: string;
      table_id?: string;
    }) => {
      const id = data?.orderId || data?.order_id;
      const sessId = data?.sessionId || data?.session_id;
      const tblId = data?.tableId || data?.table_id;
      setOrders((prev) =>
        prev.map((o) => {
          if ((id && o.id === id) || (sessId && o.diningSessionId === sessId) || (tblId && o.tableId === tblId)) {
            const updated = {
              ...o,
              paymentStatus: 'PAID' as const,
              billGenerated: true,
            };
            const active = isOrderActive(updated);
            return {
              ...updated,
              activityStatus: active ? 'ACTIVE' : 'INACTIVE',
              isActive: active,
            };
          }
          return o;
        })
      );
    };
    const unsubPayment = wsManager.on('PAYMENT_SETTLED', handlePaymentSettled);

    // Background polling fallback every 15s
    const interval = setInterval(loadOrders, 15000);
    return () => {
      active = false;
      clearInterval(interval);
      unsubPlaced();
      unsubCreated();
      unsubAccepted();
      unsubInKitchen();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
      unsubTransferred();
      unsubBill();
      unsubPayment();
    };
  }, [loadOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    // In-place optimistic update for instantaneous UI feedback without full page reload
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: nextStatus, updatedAt: new Date().toISOString() }
          : o
      )
    );

    try {
      if (nextStatus === 'ACCEPTED') {
        await ordersApi.acceptOrder(orderId);
      } else if (nextStatus === 'COMPLETED') {
        const ord = orders.find((o) => o.id === orderId);
        if (ord) {
          const check = canCompleteOrder(ord);
          if (!check.canComplete) {
            const reason = check.isChefPending && check.isKotPending
              ? "Both Kitchen and KOT preparations are pending."
              : check.isChefPending
              ? "Chef kitchen preparation is still pending."
              : "KOT beverage/dessert preparation is still pending.";
            throw new Error(`Cannot complete order: ${reason}`);
          }
        }
        await ordersApi.completeOrder(orderId);
      } else {
        await ordersApi.updateStatus(orderId, nextStatus);
      }
    } catch (err) {
      console.error('Failed to update order status:', err);
      // Revert from backend if API call fails
      loadOrders();
      throw err;
    }
  };

  // Extract unique table numbers dynamically from orders
  const uniqueTables = useMemo(() => {
    const tableSet = new Set<number>();
    orders.forEach((o) => {
      if (typeof o.tableNumber === 'number') {
        tableSet.add(o.tableNumber);
      }
    });
    return Array.from(tableSet).sort((a, b) => a - b);
  }, [orders]);

  // Date matching helper
  const matchesDateRange = (createdAt: string, range: DateFilterOption): boolean => {
    if (range === 'ALL') return true;
    const orderDate = new Date(createdAt);
    if (isNaN(orderDate.getTime())) return true;

    const now = new Date();
    if (range === 'today') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth() &&
        orderDate.getDate() === now.getDate()
      );
    }
    if (range === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return (
        orderDate.getFullYear() === yesterday.getFullYear() &&
        orderDate.getMonth() === yesterday.getMonth() &&
        orderDate.getDate() === yesterday.getDate()
      );
    }
    if (range === '30_days') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return orderDate >= thirtyDaysAgo;
    }
    if (range === 'month') {
      return (
        orderDate.getFullYear() === now.getFullYear() &&
        orderDate.getMonth() === now.getMonth()
      );
    }
    if (range === 'year') {
      return orderDate.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // Composable Filter Evaluation
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 0. Activity Filter (Default: ACTIVE)
      if (activityFilter === 'ACTIVE') {
        if (isOrderInactive(order)) return false;
      } else if (activityFilter === 'INACTIVE') {
        if (!isOrderInactive(order)) return false;
      }

      // 1. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'PLACED') {
          if (order.status !== 'PLACED' && order.status !== 'ORDER_PLACED') return false;
        } else if (order.status !== statusFilter) {
          return false;
        }
      }

      // 2. Date Filter
      if (!matchesDateRange(order.createdAt, dateFilter)) {
        return false;
      }

      // 3. Table Filter
      if (tableFilter !== 'ALL') {
        if (order.tableNumber.toString() !== tableFilter) return false;
      }

      // 4. Payment Filter (Admin view only)
      if (!isChef && paymentFilter !== 'ALL') {
        const orderPayment = order.paymentStatus || 'PENDING';
        if (orderPayment !== paymentFilter) return false;
      }

      // 5. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          order.id.toLowerCase().includes(q) ||
          (order.customerName && order.customerName.toLowerCase().includes(q)) ||
          (order.customerMobile && order.customerMobile.includes(q)) ||
          order.tableNumber.toString().includes(q) ||
          (order.items && order.items.some((i) => i.name.toLowerCase().includes(q)));
        if (!matches) return false;
      }

      return true;
    });
  }, [orders, activityFilter, statusFilter, dateFilter, tableFilter, paymentFilter, searchQuery, isChef]);

  // Check if any filter is actively applied
  const hasActiveFilters =
    activityFilter !== 'ACTIVE' ||
    statusFilter !== 'ALL' ||
    dateFilter !== 'ALL' ||
    tableFilter !== 'ALL' ||
    paymentFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setActivityFilter('ACTIVE');
    setStatusFilter('ALL');
    setDateFilter('ALL');
    setTableFilter('ALL');
    setPaymentFilter('ALL');
    setSearchQuery('');
  };

  // CustomSelect Options Definitions
  const activityOptions = [
    { value: 'ACTIVE', label: `Active (${activeCount})` },
    { value: 'INACTIVE', label: `Inactive (${inactiveCount})` },
  ];

  const statusOptions = [
    { value: 'ALL', label: `All Orders (${orders.length})` },
    {
      value: 'PLACED',
      label: `Placed (${orders.filter((o) => o.status === 'PLACED' || o.status === 'ORDER_PLACED').length})`,
    },
    {
      value: 'ACCEPTED',
      label: `Accepted (${orders.filter((o) => o.status === 'ACCEPTED').length})`,
    },
    {
      value: 'IN_KITCHEN',
      label: `In Kitchen (${orders.filter((o) => o.status === 'IN_KITCHEN' || o.status === 'SERVED').length})`,
    },
    {
      value: 'COMPLETED',
      label: `Completed (${orders.filter((o) => o.status === 'COMPLETED').length})`,
    },
    {
      value: 'CANCELLED',
      label: `Cancelled (${orders.filter((o) => o.status === 'CANCELLED').length})`,
    },
  ];

  const dateOptions = DATE_FILTER_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const tableOptions = [
    { value: 'ALL', label: 'All Tables' },
    ...uniqueTables.map((tblNum) => ({
      value: tblNum.toString(),
      label: `Table ${tblNum.toString().padStart(2, '0')}`,
    })),
  ];

  const paymentOptions = [
    { value: 'ALL', label: 'All Payments' },
    { value: 'PENDING', label: 'Pending Payment' },
    { value: 'PAID', label: 'Paid' },
  ];

  const quickFilterChips = [
    { label: 'All', value: 'ALL', count: orders.length },
    {
      label: 'Placed',
      value: 'PLACED',
      count: orders.filter((o) => o.status === 'PLACED' || o.status === 'ORDER_PLACED').length,
    },
    {
      label: 'Accepted',
      value: 'ACCEPTED',
      count: orders.filter((o) => o.status === 'ACCEPTED').length,
    },
    {
      label: 'In Kitchen',
      value: 'IN_KITCHEN',
      count: orders.filter((o) => o.status === 'IN_KITCHEN' || o.status === 'SERVED').length,
    },
    {
      label: 'Completed',
      value: 'COMPLETED',
      count: orders.filter((o) => o.status === 'COMPLETED').length,
    },
  ];

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-5 sm:space-y-6">
        {/* Top Header with 3-State Activity Dropdown */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight font-serif">
                {isChef ? 'Kitchen Orders Queue' : 'Live Orders Management'}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-green text-brand-beige">
                {orders.length} total tickets
              </span>
            </div>
            <p className="text-xs text-brand-green/70 mt-0.5">
              {isChef
                ? 'Operational live tickets for food preparation (Pricing strictly excluded)'
                : 'Monitor real-time tickets, advance preparation workflow, and finalize billing.'}
            </p>
          </div>

          {/* 3-State Activity Selector Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <CustomSelect
              value={activityFilter}
              onChange={(val) => setActivityFilter(val as ActivityFilterOption)}
              options={activityOptions}
              icon={<Activity className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />}
              className="w-full sm:w-48"
              buttonClassName="py-2 px-3 text-xs font-black shadow-2xs border-brand-green/20"
              placeholder="Active Orders"
              ariaLabel="Filter orders by activity"
            />
          </div>
        </div>

        {/* Order Count Summary Bar */}
        <div className="flex items-center justify-end gap-3 border-b border-brand-beige-dark/60 pb-2">
          <div className="text-xs text-brand-green/60 font-medium">
            Showing <strong className="text-brand-green font-bold">{filteredOrders.length}</strong> of{' '}
            {activityFilter === 'ACTIVE'
              ? `${activeCount} active`
              : `${inactiveCount} inactive`}{' '}
            orders
          </div>
        </div>

        {/* Custom Filter Control Toolbar */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-brand-beige-dark shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
            {/* Composable Dropdowns using CustomSelect */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {/* Status Filter Dropdown */}
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={statusOptions}
                icon={<Filter className="w-3.5 h-3.5 text-brand-green/60 shrink-0" />}
                className="w-full xs:w-48 sm:w-52"
                buttonClassName="py-2 px-3 text-xs"
                placeholder="All Orders"
                ariaLabel="Filter orders by status"
              />

              {/* Date Filter Dropdown */}
              <CustomSelect
                value={dateFilter}
                onChange={(val) => setDateFilter(val as DateFilterOption)}
                options={dateOptions}
                icon={<Calendar className="w-3.5 h-3.5 text-brand-green/60 shrink-0" />}
                className="w-full xs:w-36 sm:w-40"
                buttonClassName="py-2 px-3 text-xs"
                placeholder="All Dates"
                ariaLabel="Filter orders by date"
              />

              {/* Table Filter Dropdown */}
              <CustomSelect
                value={tableFilter}
                onChange={(val) => setTableFilter(val)}
                options={tableOptions}
                icon={<Utensils className="w-3.5 h-3.5 text-brand-green/60 shrink-0" />}
                className="w-full xs:w-36 sm:w-40"
                buttonClassName="py-2 px-3 text-xs"
                placeholder="All Tables"
                ariaLabel="Filter orders by table"
              />

              {/* Payment Filter Dropdown (Admin View Only) */}
              {!isChef && (
                <CustomSelect
                  value={paymentFilter}
                  onChange={(val) => setPaymentFilter(val)}
                  options={paymentOptions}
                  icon={<CreditCard className="w-3.5 h-3.5 text-brand-green/60 shrink-0" />}
                  className="w-full xs:w-36 sm:w-40"
                  buttonClassName="py-2 px-3 text-xs"
                  placeholder="All Payments"
                  ariaLabel="Filter orders by payment status"
                />
              )}

              {/* Clear Filters Button (Visible only when filters are active) */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-brand-green/70 hover:text-brand-green bg-brand-beige-light hover:bg-brand-beige border border-brand-beige-dark transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-2xs active:scale-95"
                  title="Clear all active filters"
                >
                  <X className="w-3.5 h-3.5 text-brand-green/50" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Live Search Input */}
            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-brand-green/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order ID, guest, dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-brand-beige-light/50 border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:bg-white transition-colors shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-green/40 hover:text-brand-green cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Status Count Chips for Fast Desktop/Tablet/Mobile Tapping */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-brand-beige-dark/40">
            {quickFilterChips.map((chip) => {
              const isActive = statusFilter === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setStatusFilter(chip.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-brand-green text-brand-beige shadow-xs'
                      : 'bg-brand-beige-light/50 text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark/60'
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-brand-beige text-brand-green font-black' : 'bg-white text-brand-green/70'
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Orders Grid Display */}
        {isLoading ? (
          <div className="py-16 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-3 px-4">
            <Loader2 className="w-8 h-8 text-brand-green animate-spin mx-auto" />
            <p className="text-xs font-bold text-brand-green">Loading orders...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 bg-white rounded-3xl border border-red-200 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-red-700 text-base">Unable to load orders</h3>
            <p className="text-xs text-red-600/80 max-w-md mx-auto">{loadError}</p>
            <button
              type="button"
              onClick={loadOrders}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-gold" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-brand-beige flex items-center justify-center mx-auto text-brand-green/40">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-brand-green text-base">No matching orders found</h3>
            <p className="text-xs text-brand-green/60 max-w-md mx-auto">
              There are no orders matching your current filter criteria. Try adjusting your status, date, or search keyword.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-brand-gold" />
                <span>Reset All Filters</span>
              </button>
            )}
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

      <BillModal
        orderId={selectedBillOrderId}
        sessionId={selectedBillSessionId}
        onClose={() => {
          setSelectedBillOrderId(null);
          setSelectedBillSessionId(null);
        }}
        onSettled={() => {
          loadOrders();
        }}
      />
    </AppLayout>
  );
}
