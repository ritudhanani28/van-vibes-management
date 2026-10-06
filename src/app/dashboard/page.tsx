'use client';

import Link from 'next/link';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/features/orders/components/OrderCard';
import { BillModal } from '@/features/billing/components/BillModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { ActivityFilterOption, isOrderActive, isOrderInactive, Order, OrderStatus, TableInfo } from '@/types/cafe';
import { ordersApi } from '@/api/orders';
import { canCompleteOrder } from '@/utils/kot';
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
  Download,
  Utensils,
  X,
  Loader2,
  AlertCircle,
  RotateCcw,
  Activity,
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
  const [activityFilter, setActivityFilter] = useState<ActivityFilterOption>('ACTIVE');
  const [activeFilter, setActiveFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillOrderId, setSelectedBillOrderId] = useState<string | null>(null);
  const [selectedBillSessionId, setSelectedBillSessionId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async (rangeToFetch: DateRangeOption = dateRange) => {
    try {
      setLoadError(null);
      const [fetchedOrders, fetchedTables] = await Promise.all([
        ordersApi.getOrders({ range: rangeToFetch }),
        tablesApi.getTables(),
      ]);
      setOrders(fetchedOrders);
      setTables(fetchedTables);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load dashboard data. Please try again.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      ordersApi.getOrders({ range: dateRange }),
      tablesApi.getTables(),
    ]).then(([fetchedOrders, fetchedTables]) => {
      if (active) {
        setOrders(fetchedOrders);
        setTables(fetchedTables);
        setLoadError(null);
      }
    }).catch((err) => {
      if (active) {
        const msg = err instanceof Error ? err.message : 'Unable to load dashboard data. Please try again.';
        setLoadError(msg);
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });

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
    const unsubPay = wsManager.on('PAYMENT_SETTLED', handlePaymentSettled);

    const unsubTbl = wsManager.on('TABLE_STATUS_UPDATED', (data: { tableId: string; status: TableInfo['status'] }) => {
      setTables((prev) =>
        prev.map((t) => (t.id === data.tableId ? { ...t, status: data.status } : t))
      );
    });

    const interval = setInterval(() => {
      loadData(dateRange);
    }, 8000);

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
      unsubBill();
      unsubPay();
      unsubTbl();
    };
  }, [dateRange, loadData]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
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
      console.error('Failed to update status on backend:', err);
      throw err;
    }
    loadData(dateRange);
  };

  // Activity Counts
  const activeCount = useMemo(() => orders.filter((o) => isOrderActive(o)).length, [orders]);
  const inactiveCount = useMemo(() => orders.filter((o) => isOrderInactive(o)).length, [orders]);

  const activityOptions = useMemo(
    () => [
      { value: 'ACTIVE', label: `Active (${activeCount})` },
      { value: 'INACTIVE', label: `Inactive (${inactiveCount})` },
    ],
    [activeCount, inactiveCount]
  );

  // KPIs calculated live from filtered state
  const totalOrders = orders.length;
  const kitchenPending = orders.filter((o) =>
    ['PLACED', 'ORDER_PLACED', 'ACCEPTED'].includes(o.status)
  ).length;
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED').length;
  const paidRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Extract unique table numbers dynamically from tables and orders
  const uniqueTables = useMemo(() => {
    const tableSet = new Set<number>();
    tables.forEach((t) => {
      if (typeof t.tableNumber === 'number') {
        tableSet.add(t.tableNumber);
      }
    });
    orders.forEach((o) => {
      if (typeof o.tableNumber === 'number') {
        tableSet.add(o.tableNumber);
      }
    });
    return Array.from(tableSet).sort((a, b) => a - b);
  }, [tables, orders]);

  const tableOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Tables' },
      ...uniqueTables.map((tblNum) => ({
        value: tblNum.toString(),
        label: `Table ${tblNum.toString().padStart(2, '0')}`,
      })),
    ],
    [uniqueTables]
  );

  // Filtered orders with Activity, Status, Table, and Search
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 0. Activity Filter (Default: ACTIVE)
      if (activityFilter === 'ACTIVE') {
        if (isOrderInactive(order)) return false;
      } else if (activityFilter === 'INACTIVE') {
        if (!isOrderInactive(order)) return false;
      }

      // 1. Status Filter
      if (activeFilter !== 'ALL') {
        if (activeFilter === 'PLACED') {
          if (order.status !== 'PLACED' && order.status !== 'ORDER_PLACED') return false;
        } else if (order.status !== activeFilter) {
          return false;
        }
      }

      // 2. Table Filter
      if (tableFilter !== 'ALL') {
        if (order.tableNumber.toString() !== tableFilter) return false;
      }

      // 3. Search Query
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
  }, [orders, activityFilter, activeFilter, tableFilter, searchQuery]);

  const hasActiveFilters =
    activityFilter !== 'ACTIVE' ||
    activeFilter !== 'ALL' ||
    tableFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setActivityFilter('ACTIVE');
    setActiveFilter('ALL');
    setTableFilter('ALL');
    setSearchQuery('');
  };

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

          {/* Actions: Activity Filter, Date Filter & Export Data */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <CustomSelect
              value={activityFilter}
              onChange={(val) => setActivityFilter(val as ActivityFilterOption)}
              options={activityOptions}
              icon={<Activity className="w-3.5 h-3.5 text-brand-green/70 shrink-0" />}
              className="w-40 sm:w-44"
              buttonClassName="py-2 px-3 shadow-2xs font-bold text-xs"
              ariaLabel="Filter orders by activity"
            />
            <CustomSelect
              value={dateRange}
              onChange={(val) => setDateRange(val as DateRangeOption)}
              options={DATE_RANGE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: opt.label,
              }))}
              icon={<Calendar className="w-3.5 h-3.5 text-brand-green/60 shrink-0" />}
              className="w-40 sm:w-44"
              buttonClassName="py-2 px-3 shadow-2xs text-xs"
              ariaLabel="Select Date Range"
            />
            <Link
              href="/export"
              className="px-3.5 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-brand-gold shrink-0" />
              <span>Export Data</span>
            </Link>
          </div>
        </div>

        {/* Operational KPI Metric Cards & Sections with Loading/Error states */}
        {isLoading ? (
          <div className="py-16 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-3 px-4">
            <Loader2 className="w-8 h-8 text-brand-green animate-spin mx-auto" />
            <p className="text-xs font-bold text-brand-green">Loading dashboard metrics...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 bg-white rounded-3xl border border-red-200 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-red-700 text-base">Unable to load dashboard</h3>
            <p className="text-xs text-red-600/80 max-w-md mx-auto">{loadError}</p>
            <button
              type="button"
              onClick={() => loadData(dateRange)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-gold" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
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

        {/* Filter Pills, Table Filter & Search Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
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

          {/* Right Controls: Table Filter Dropdown & Search Box */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
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

            {/* Search Box */}
            <div className="relative flex-1 sm:w-60 min-w-[200px]">
              <Search className="w-4 h-4 text-brand-green/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID, customer, table, dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              />
            </div>

            {/* Reset Filters Quick Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 text-brand-green/60 hover:text-brand-green bg-white hover:bg-brand-beige border border-brand-beige-dark rounded-xl transition-colors cursor-pointer shrink-0"
                title="Reset filters"
                aria-label="Reset filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live Orders Feed */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-beige-dark/60 pb-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-brand-green font-serif">
                  Orders
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-green text-brand-beige">
                  Showing {filteredOrders.length} of{' '}
                  {activityFilter === 'ACTIVE'
                    ? `${activeCount} active`
                    : `${inactiveCount} inactive`}
                </span>
              </div>
              <p className="text-xs text-brand-green/70 mt-0.5">
                Real-time tickets tracked across kitchen cooking, billing, and settlement.
              </p>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="py-12 bg-white rounded-2xl border border-brand-beige-dark text-center space-y-3">
              <Filter className="w-8 h-8 text-brand-green/30 mx-auto" />
              <p className="text-xs font-bold text-brand-green/60">No orders match the current filter</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-green text-brand-beige text-xs font-bold hover:bg-brand-green-hover transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Filters</span>
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
          </>
        )}
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
