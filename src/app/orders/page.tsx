'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { BillModal } from '@/components/billing/BillModal';
import { Order, OrderStatus } from '@/types/cafe';
import { ordersApi } from '@/api/orders';
import { wsManager } from '@/services/websocket/WebSocketManager';
import { useAuth } from '@/context/AuthContext';
import { Search, ShoppingBag } from 'lucide-react';

export default function OrdersPage() {
  const { role } = useAuth();
  const isChef = role === 'CHEF';
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillOrderId, setSelectedBillOrderId] = useState<string | null>(null);
  const [selectedBillSessionId, setSelectedBillSessionId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const all = await ordersApi.getOrders();
      setOrders(all);
    } catch (err) {
      console.error('Failed to load orders:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();

    // Listen for real-time order creation
    const handleNewOrder = (newOrder: Order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
    };
    const unsubPlaced = wsManager.on('ORDER_PLACED', handleNewOrder);
    const unsubCreated = wsManager.on('ORDER_CREATED', handleNewOrder);

    // Listen for specific status transitions
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
    const unsubInKitchen = wsManager.on('ORDER_IN_KITCHEN', handleStatusTransition);
    const unsubServed = wsManager.on('ORDER_SERVED', handleStatusTransition);
    const unsubCompleted = wsManager.on('ORDER_COMPLETED', handleStatusTransition);
    const unsubUpdated = wsManager.on('ORDER_STATUS_UPDATED', handleStatusTransition);
    const unsubTransferred = wsManager.on('TABLE_TRANSFERRED', () => loadOrders());

    const interval = setInterval(loadOrders, 10000);
    return () => {
      clearInterval(interval);
      unsubPlaced();
      unsubCreated();
      unsubAccepted();
      unsubInKitchen();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
      unsubTransferred();
    };
  }, [loadOrders]);

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
      console.error('Failed to update order status:', err);
      throw err;
    }
    loadOrders();
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PLACED') {
        if (order.status !== 'PLACED' && order.status !== 'ORDER_PLACED') return false;
      } else if (order.status !== statusFilter) {
        return false;
      }
    }
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerMobile && order.customerMobile.includes(q)) ||
      (order.items && order.items.some((i) => i.name.toLowerCase().includes(q)))
    );
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
                {isChef ? 'Kitchen Orders Queue' : 'Orders Management'}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-green text-brand-beige">
                {orders.length} tickets
              </span>
            </div>
            <p className="text-xs text-brand-green/70 mt-0.5">
              {isChef
                ? 'Operational live tickets for food preparation (Pricing strictly excluded)'
                : 'Monitor, manage dish status, and generate bills'}
            </p>
          </div>

        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {(
              [
                { label: 'All', value: 'ALL' },
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
              const isActive = statusFilter === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
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
              placeholder="Search order ID, guest, mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </div>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-brand-green/30 mx-auto" />
            <h3 className="font-extrabold text-brand-green text-base">No orders found</h3>
            <p className="text-xs text-brand-green/60">
              There are no orders matching your current filter criteria.
            </p>
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
