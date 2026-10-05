'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { BillModal } from '@/features/billing/components/BillModal';
import { DiningSession } from '@/types/cafe';
import { diningSessionsApi } from '@/api/diningSessions';
import { billingApi, InvoiceRecord } from '@/api/billing';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Search,
  Layers,
  UtensilsCrossed,
} from 'lucide-react';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'PENDING' | 'LEDGER'>('SESSIONS');
  const [sessions, setSessions] = useState<DiningSession[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceRecord[]>([]);
  const [ledgerInvoices, setLedgerInvoices] = useState<InvoiceRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoadError(null);
      const [sessData, pendingData, ledgerData] = await Promise.all([
        diningSessionsApi.getSessions(),
        billingApi.getPendingPayments(),
        billingApi.getLedger(),
      ]);
      setSessions(sessData);
      setPendingInvoices(pendingData);
      setLedgerInvoices(ledgerData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to load billing data. Please try again.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    Promise.all([
      diningSessionsApi.getSessions(),
      billingApi.getPendingPayments(),
      billingApi.getLedger(),
    ]).then(([sessData, pendingData, ledgerData]) => {
      if (active) {
        setSessions(sessData);
        setPendingInvoices(pendingData);
        setLedgerInvoices(ledgerData);
        setLoadError(null);
      }
    }).catch((err) => {
      if (active) {
        const msg = err instanceof Error ? err.message : 'Unable to load billing data. Please try again.';
        setLoadError(msg);
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    const unsubTable = wsManager.on('TABLE_STATUS_UPDATED', () => loadData());
    const unsubPay = wsManager.on('PAYMENT_SETTLED', () => loadData());
    const unsubOrder = wsManager.on('ORDER_PLACED', () => loadData());

    const interval = setInterval(loadData, 8000);
    return () => {
      active = false;
      clearInterval(interval);
      unsubTable();
      unsubPay();
      unsubOrder();
    };
  }, [loadData]);

  const handleSettle = async (invoice: InvoiceRecord, method: string) => {
    try {
      if (invoice.diningSessionId) {
        await billingApi.settleSessionPayment(invoice.diningSessionId, method);
      } else if (invoice.orderId) {
        await billingApi.settlePayment(invoice.orderId, method);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to settle payment:', err);
    }
  };

  // Metrics
  const totalInvoices = ledgerInvoices.length;
  const totalTax = ledgerInvoices.reduce((acc, curr) => acc + (curr.taxAmount || 0), 0);
  const settledRevenue = ledgerInvoices
    .filter((inv) => inv.paymentStatus === 'PAID')
    .reduce((acc, curr) => acc + (curr.total || 0), 0);

  // Active open or bill-generated sessions that are NOT settled or completed with payment
  const activeSessions = sessions.filter((s) => {
    // Exclude if marked CLOSED, payment is PAID, or closedAt timestamp exists
    if (s.status === 'CLOSED' || s.paymentStatus === 'PAID' || Boolean(s.closedAt)) {
      return false;
    }
    // Exclude if this session has a settled PAID invoice in the ledger
    const hasPaidInvoice = ledgerInvoices.some(
      (inv) => inv.diningSessionId === s.id && inv.paymentStatus === 'PAID'
    );
    if (hasPaidInvoice) {
      return false;
    }
    return true;
  });

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              Billing & Dining Sessions POS
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              Consolidated dining session bills, table occupancy lifecycle, and digital tax invoices.
            </p>
          </div>

        </div>

        {/* Financial Metrics Summary */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-brand-green/60">
              Active Dining Sessions
            </span>
            <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
              {activeSessions.length}
            </p>
            <p className="text-[11px] text-brand-green/60">Tables currently dining or billing</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-amber-700">
              Pending Unpaid Bills
            </span>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
              {pendingInvoices.length}
            </p>
            <p className="text-[11px] text-amber-800/60">Awaiting payment settlement</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-brand-green/60">
              Total 5% GST Collected
            </span>
            <p className="text-2xl sm:text-3xl font-black text-brand-green font-mono">
              ₹{totalTax.toFixed(0)}
            </p>
            <p className="text-[11px] text-brand-green/60">CGST 2.5% + SGST 2.5%</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-beige-dark shadow-xs space-y-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-brand-gold-dark">
              Settled Revenue
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
              ₹{settledRevenue.toFixed(0)}
            </p>
            <p className="text-[11px] text-emerald-900/60">Total paid receipts</p>
          </div>
        </div>

        {/* View Selection Tabs & Content with Loading/Error states */}
        {isLoading ? (
          <div className="py-16 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-3 px-4">
            <Loader2 className="w-8 h-8 text-brand-green animate-spin mx-auto" />
            <p className="text-xs font-bold text-brand-green">Loading billing records...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 bg-white rounded-3xl border border-red-200 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-red-700 text-base">Unable to load billing data</h3>
            <p className="text-xs text-red-600/80 max-w-md mx-auto">{loadError}</p>
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
            >
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <>
        {/* View Selection Tabs */}
        <div className="flex border-b border-brand-beige-dark bg-white rounded-2xl p-1.5 shadow-2xs gap-1 overflow-x-auto no-scrollbar flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('SESSIONS')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 sm:shrink flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'SESSIONS'
                ? 'bg-brand-green text-brand-beige shadow-xs'
                : 'text-brand-green/70 hover:bg-brand-beige-light'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Dining Sessions ({activeSessions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 sm:shrink flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-brand-green text-brand-beige shadow-xs'
                : 'text-brand-green/70 hover:bg-brand-beige-light'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Payments ({pendingInvoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 sm:shrink flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'bg-brand-green text-brand-beige shadow-xs'
                : 'text-brand-green/70 hover:bg-brand-beige-light'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Settled Ledger ({totalInvoices})</span>
          </button>
        </div>

        {/* TAB 1: ACTIVE DINING SESSIONS */}
        {activeTab === 'SESSIONS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeSessions.length === 0 ? (
                <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-brand-beige-dark p-6">
                  <UtensilsCrossed className="w-10 h-10 text-brand-green/30 mx-auto mb-2" />
                  <p className="text-sm font-bold text-brand-green">No active dining sessions</p>
                  <p className="text-xs text-brand-green/60 mt-1">
                    When customers scan table QR codes and place orders, active sessions appear here.
                  </p>
                </div>
              ) : (
                activeSessions.map((sess) => {
                  const isBillGen = sess.status === 'BILL_GENERATED';
                  return (
                    <div
                      key={sess.id}
                      className="bg-white rounded-2xl border border-brand-beige-dark p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                    >
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark/50">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-full bg-brand-green text-brand-beige font-black text-sm flex items-center justify-center font-mono">
                              {sess.tableNumber.toString().padStart(2, '0')}
                            </span>
                            <div>
                              <h3 className="font-extrabold text-sm text-brand-green">
                                Table {sess.tableNumber.toString().padStart(2, '0')}
                              </h3>
                              <p className="text-[10px] text-brand-green/60 font-mono">
                                Session {sess.id}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
                                isBillGen
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {sess.status.replace('_', ' ')}
                            </span>
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                                sess.tableStatus === 'AVAILABLE'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              Table {sess.tableStatus || 'AVAILABLE'}
                            </span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-xs text-brand-green">
                          <div className="flex justify-between">
                            <span className="text-brand-green/70">Orders placed:</span>
                            <span className="font-bold font-mono">{sess.orderCount || 0} orders</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-brand-green/70">Session Total:</span>
                            <span className="font-bold font-mono text-base text-brand-green-deep">
                              ₹{(sess.totalAmount || 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-brand-green/60">
                            <span>Started:</span>
                            <span>{new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="pt-3 border-t border-brand-beige-dark/50 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSessionId(sess.id)}
                          className="w-full py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-brand-gold" />
                          <span>{isBillGen ? 'View / Print Final Bill' : 'Generate Final Bill'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PENDING UNPAID PAYMENTS */}
        {activeTab === 'PENDING' && (
          <div className="bg-white rounded-3xl border border-brand-beige-dark shadow-xs overflow-hidden">
            <div className="p-4 border-b border-brand-beige-dark bg-brand-beige-light/40 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-brand-green">Unpaid Invoices Awaiting Settlement</h3>
                <p className="text-[11px] text-brand-green/70">
                  Note: A physical table may already be AVAILABLE or occupied by a new guest while an older bill is pending payment.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-beige-dark bg-brand-beige-light text-[10px] uppercase tracking-wider font-extrabold text-brand-green/70">
                    <th className="py-3 px-4">Invoice / Bill ID</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Dining Session</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Total Due</th>
                    <th className="py-3 px-4">Table Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-beige-dark/50 text-xs text-brand-green font-medium">
                  {pendingInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-brand-green/50">
                        No pending unpaid bills! All dining receipts settled.
                      </td>
                    </tr>
                  ) : (
                    pendingInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-brand-beige-light/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold">{inv.invoiceNumber}</td>
                        <td className="py-3.5 px-4 font-bold">
                          Table {inv.tableNumber ? inv.tableNumber.toString().padStart(2, '0') : '--'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-brand-green/70">
                          {inv.diningSessionId || '--'}
                        </td>
                        <td className="py-3.5 px-4">{inv.customerName || 'Dining Guest'}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-brand-green-deep">
                          ₹{inv.total.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              inv.tableStatus === 'AVAILABLE'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {inv.tableStatus || 'AVAILABLE'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleSettle(inv, 'UPI')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Settle UPI
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSettle(inv, 'CASH')}
                              className="px-2.5 py-1 rounded-lg bg-brand-green hover:bg-brand-green-hover text-brand-beige text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Settle Cash
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (inv.diningSessionId) setSelectedSessionId(inv.diningSessionId);
                                else if (inv.orderId) setSelectedOrderId(inv.orderId);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-beige hover:bg-brand-beige-dark text-brand-green text-[11px] font-bold transition-colors border border-brand-beige-dark cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-brand-gold" />
                              <span>View Receipt</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SETTLED LEDGER */}
        {activeTab === 'LEDGER' && (
          <div className="bg-white rounded-3xl border border-brand-beige-dark shadow-xs overflow-hidden">
            <div className="p-4 border-b border-brand-beige-dark flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-brand-green/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice number, table, session..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-brand-beige-light border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-beige-dark bg-brand-beige-light text-[10px] uppercase tracking-wider font-extrabold text-brand-green/70">
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Discount</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-beige-dark/50 text-xs text-brand-green font-medium">
                  {ledgerInvoices
                    .filter((inv) => {
                      if (!searchQuery.trim()) return true;
                      const q = searchQuery.toLowerCase().trim();
                      return (
                        inv.invoiceNumber.toLowerCase().includes(q) ||
                        (inv.diningSessionId && inv.diningSessionId.toLowerCase().includes(q)) ||
                        (inv.customerName && inv.customerName.toLowerCase().includes(q))
                      );
                    })
                    .map((inv) => {
                      const isPaid = inv.paymentStatus === 'PAID';
                      return (
                        <tr key={inv.id} className="hover:bg-brand-beige-light/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold">{inv.invoiceNumber}</td>
                          <td className="py-3.5 px-4">
                            Table {inv.tableNumber ? inv.tableNumber.toString().padStart(2, '0') : '--'}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-brand-green/70">
                            {inv.diningSessionId || '--'}
                          </td>
                          <td className="py-3.5 px-4 font-bold">{inv.customerName || 'Dining Guest'}</td>
                          <td className="py-3.5 px-4 font-mono text-brand-green font-bold">
                            {inv.discountAmount && inv.discountAmount > 0
                              ? `-₹${inv.discountAmount.toFixed(2)} (${inv.discountPercentage}%)`
                              : '--'}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-green-deep">
                            ₹{inv.total.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isPaid
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                              <span>{inv.paymentStatus}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (inv.diningSessionId) setSelectedSessionId(inv.diningSessionId);
                                else if (inv.orderId) setSelectedOrderId(inv.orderId);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-beige hover:bg-brand-beige-dark text-brand-green text-[11px] font-bold transition-colors border border-brand-beige-dark cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5 text-brand-gold" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {/* Bill Receipt & Settlement Modal */}
      <BillModal
        orderId={selectedOrderId}
        sessionId={selectedSessionId}
        onClose={() => {
          setSelectedOrderId(null);
          setSelectedSessionId(null);
        }}
        onSettled={() => {
          loadData();
        }}
      />
    </AppLayout>
  );
}
