'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { BillModal } from '@/components/billing/BillModal';
import { Order, OrderStatus } from '@/types/cafe';
import { CafeStore } from '@/lib/cafe-store';
import { useAuth } from '@/context/AuthContext';
import { Search, Filter, RefreshCw, ShoppingBag } from 'lucide-react';

export default function OrdersPage() {
  const { role } = useAuth();
  const isChef = role === 'CHEF';
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillOrderId, setSelectedBillOrderId] = useState<string | null>(null);
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
    const interval = setInterval(loadOrders, 6000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    CafeStore.updateOrderStatus(orderId, nextStatus);
    loadOrders();
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;
    if (tableFilter !== 'ALL' && order.tableNumber.toString() !== tableFilter) return false;
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerMobile && order.customerMobile.includes(q)) ||
      order.items.some((i) => i.name.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              Orders Management & History
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              {isChef ? 'Filter kitchen orders by table, preparation stage, and search keywords.' : 'Filter orders by table, stage progression, customer details, and invoice receipts.'}
            </p>
          </div>

          <button
            onClick={loadOrders}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-brand-beige border border-brand-beige-dark text-xs font-bold text-brand-green shadow-2xs transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-2xl border border-brand-beige-dark p-4 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order ID, name, dish..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
              />
            </div>

            {/* Table Dropdown */}
            <div>
              <select
                value={tableFilter}
                onChange={(e) => setTableFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
              >
                <option value="ALL">All Tables (01–12)</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num.toString()}>
                    Table {num.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[40px]"
              >
                <option value="ALL">All Statuses</option>
                <option value="ORDER_PLACED">Order Placed</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-brand-green/70 px-1">
            <span>Showing {filteredOrders.length} orders</span>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-brand-beige-dark space-y-2">
              <ShoppingBag className="w-10 h-10 text-brand-green/30 mx-auto" />
              <p className="font-bold text-sm text-brand-green">No orders found</p>
              <p className="text-xs text-brand-green/60">
                Try resetting your filters or search keywords.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateStatus}
                  onOpenBill={isChef ? undefined : (id) => setSelectedBillOrderId(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bill Receipt Modal */}
      {!isChef && selectedBillOrderId && (
        <BillModal
          orderId={selectedBillOrderId}
          onClose={() => setSelectedBillOrderId(null)}
        />
      )}
    </AppLayout>
  );
}
