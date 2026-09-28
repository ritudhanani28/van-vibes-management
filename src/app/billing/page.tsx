'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BillModal } from '@/components/billing/BillModal';
import { Order } from '@/types/cafe';
import { CafeStore } from '@/lib/cafe-store';
import {
  Receipt,
  DollarSign,
  FileText,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  TrendingUp,
} from 'lucide-react';

export default function BillingPage() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(() => {
    const all = CafeStore.getAllOrders();
    setOrders([...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Financial aggregates (only full summary for admin)
  const totalGross = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const completedRevenue = orders
    .filter((o) => o.status === 'COMPLETED' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.total, 0);

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      order.id.toLowerCase().includes(q) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      order.tableNumber.toString().includes(q)
    );
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              Billing & Revenue Ledger
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Itemized receipts, GST breakdown, customer invoices, and POS records.
            </p>
          </div>
        </div>

        {/* Admin Financial Summary Metrics */}
        
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-black text-brand-green/50 tracking-wider">
                Total Orders
              </span>
              <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
                {orders.length}
              </p>
              <p className="text-[11px] text-brand-green/60">Bills generated</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-black text-brand-green/50 tracking-wider">
                Gross Subtotal
              </span>
              <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
                ₹{totalGross.toFixed(0)}
              </p>
              <p className="text-[11px] text-brand-green/60">Before taxes</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-black text-brand-green/50 tracking-wider">
                GST (5%)
              </span>
              <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
                ₹{totalTax.toFixed(0)}
              </p>
              <p className="text-[11px] text-brand-green/60">Applicable tax</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-brand-gold shadow-xs space-y-1 bg-gradient-to-br from-white to-brand-beige-light">
              <span className="text-[10px] uppercase font-black text-brand-gold-dark tracking-wider">
                Settled Revenue
              </span>
              <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
                ₹{completedRevenue.toFixed(0)}
              </p>
              <p className="text-[11px] text-brand-green/60">Collected total</p>
            </div>
          </div>

        {/* Invoices List Table */}
        <div className="bg-white rounded-2xl border border-brand-beige-dark shadow-xs overflow-hidden">
          <div className="p-4 border-b border-brand-beige-dark/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="font-extrabold text-sm sm:text-base text-brand-green">
              Invoice Ledger ({filteredOrders.length})
            </h2>

            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order #, customer..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green min-h-[36px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-brand-green">
              <thead className="bg-brand-beige-light border-b border-brand-beige-dark/60 text-[10px] uppercase font-black tracking-wider text-brand-green/60">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Table</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Placed At</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-beige-dark/40">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-brand-beige-light/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-extrabold">{order.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold px-2 py-0.5 rounded bg-brand-green text-brand-beige font-mono text-[10px]">
                        T-{order.tableNumber.toString().padStart(2, '0')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {order.customerName || 'Dine-in Guest'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-brand-green/70">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-brand-green/70">
                      {order.items.reduce((s, i) => s + i.quantity, 0)} items
                    </td>
                    <td className="px-4 py-3 font-mono font-black text-right">
                      ₹{order.total.toFixed(0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          order.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(order.id)}
                        className="px-2.5 py-1 rounded-lg bg-brand-beige hover:bg-brand-green hover:text-brand-beige text-brand-green font-bold text-[11px] border border-brand-beige-dark transition-all inline-flex items-center gap-1 shadow-2xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bill Receipt Modal */}
      {selectedOrderId && (
        <BillModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </AppLayout>
  );
}
