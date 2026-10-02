'use client';

import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '@/types/cafe';
import { useAuth } from '@/context/AuthContext';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  XCircle,
  User,
  Phone,
  Utensils,
} from 'lucide-react';

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  onOpenBill?: (orderId: string) => void;
  isKitchenView?: boolean;
}

export function OrderCard({ order, onUpdateStatus, onOpenBill, isKitchenView }: Props) {
  const { role } = useAuth();
  const isChef = role === 'CHEF' || !!isKitchenView;
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Status Badge Configuration
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PLACED':
      case 'ORDER_PLACED':
        return {
          label: 'Placed',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'ACCEPTED':
        return {
          label: isChef ? 'Incoming Order' : 'Accepted',
          color: 'bg-blue-100 text-blue-900 border-blue-300',
        };
      case 'IN_KITCHEN':
        return {
          label: 'In Kitchen',
          color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        };
      case 'SERVED':
        return {
          label: 'Served',
          color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        };
      case 'COMPLETED':
        return {
          label: 'Completed',
          color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          color: 'bg-red-100 text-red-900 border-red-300',
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-300',
        };
    }
  };

  const badge = getStatusBadge(order.status);
  const orderDate = new Date(order.createdAt);
  const formattedTime = !isNaN(orderDate.getTime())
    ? orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  useEffect(() => {
    const updateElapsed = () => {
      const orderTime = new Date(order.createdAt).getTime();
      if (!isNaN(orderTime)) {
        setElapsedMinutes(Math.max(0, Math.floor((Date.now() - orderTime) / (1000 * 60))));
      }
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  // Item counts & unit calculations
  const totalUnits = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const uniqueItemsCount = order.items.length;

  // Authoritative Next Action Determination: PLACED -> ACCEPTED -> SERVED -> COMPLETED
  const getNextAction = (
    status: OrderStatus
  ): { target: OrderStatus; label: string; loadingLabel: string; icon: React.ReactNode } | null => {
    // CHEF SIDE: ONLY "DONE" ACTION FOR INCOMING ORDERS (ACCEPTED). NO ACCEPT, NO BILL.
    if (isChef) {
      if (status === 'ACCEPTED') {
        return {
          target: 'IN_KITCHEN',
          label: 'Done',
          loadingLabel: 'Updating...',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      }
      return null;
    }

    // ADMIN ACTIONS
    switch (status) {
      case 'PLACED':
      case 'ORDER_PLACED':
        return {
          target: 'ACCEPTED',
          label: 'Accept Order',
          loadingLabel: 'Accepting...',
          icon: <CheckCircle2 className="w-4 h-4 text-brand-gold" />,
        };
      case 'ACCEPTED':
      case 'IN_KITCHEN':
      case 'SERVED':
        return {
          target: 'COMPLETED',
          label: 'Complete Order',
          loadingLabel: 'Completing...',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      case 'COMPLETED':
      case 'CANCELLED':
      default:
        return null;
    }
  };

  const nextAction = getNextAction(order.status);

  const handleExecuteAction = async () => {
    if (!nextAction || isUpdating) return;
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      await onUpdateStatus(order.id, nextAction.target);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update order status';
      console.error('Failed to transition order status:', err);
      setErrorMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-beige-dark shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-brand-beige-dark/60 bg-brand-beige-light/40 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-sm text-brand-green tracking-wider">
              {order.id}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border uppercase tracking-wider ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-brand-green/70">
            <span className="font-extrabold text-brand-green bg-brand-beige px-2 py-0.5 rounded-md">
              Table {order.tableNumber}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-brand-green/50" />
              {formattedTime}
            </span>
            {elapsedMinutes > 0 && (
              <>
                <span>•</span>
                <span
                  className={`font-bold font-mono ${
                    elapsedMinutes > 20
                      ? 'text-red-600 animate-pulse'
                      : elapsedMinutes > 10
                      ? 'text-amber-600'
                      : 'text-brand-green/60'
                  }`}
                >
                  +{elapsedMinutes}m ago
                </span>
              </>
            )}
          </div>
        </div>

        {/* Payment Status (Admin Only) */}
        {!isChef && (
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 border ${
              order.paymentStatus === 'PAID'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {order.paymentStatus || 'PENDING'}
          </span>
        )}
      </div>

      {/* Customer Info & Notes */}
      <div className="px-3.5 sm:px-4 pt-3 space-y-2">
        {(order.customerName || order.customerMobile) && (
          <div className="flex items-center gap-3 text-xs text-brand-green/80 flex-wrap">
            {order.customerName && (
              <span className="flex items-center gap-1 font-medium">
                <User className="w-3 h-3 text-brand-green/50" />
                {order.customerName}
              </span>
            )}
            {order.customerMobile && (
              <span className="flex items-center gap-1 font-mono text-brand-green/60">
                <Phone className="w-3 h-3 text-brand-green/50" />
                {order.customerMobile}
              </span>
            )}
          </div>
        )}

        {order.specialInstructions && (
          <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <span className="font-bold">Instructions: </span>
              {order.specialInstructions}
            </p>
          </div>
        )}
      </div>

      {/* Order Items List */}
      <div className="p-3.5 sm:p-4 flex-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-brand-green/50 uppercase tracking-wider pb-2 border-b border-brand-beige-dark/40 mb-2">
          <span>Items Ordered</span>
          <span className="font-mono">
            {totalUnits} {totalUnits === 1 ? 'unit' : 'units'} ({uniqueItemsCount}{' '}
            {uniqueItemsCount === 1 ? 'item' : 'items'})
          </span>
        </div>

        <div className="divide-y divide-brand-beige-dark/40 text-xs">
          {order.items.map((item, idx) => {
            const qty = item.quantity || 1;
            const itemName = item.name || item.item_name || 'Item';

            // Authoritative price calculation from backend data
            const rawUnitPrice = item.unitPrice ?? item.unit_price ?? item.price;
            const rawLineTotal = item.lineTotal ?? item.line_total ?? item.itemTotal ?? item.item_total;

            let unitPrice = 0;
            let lineTotal = 0;

            if (rawLineTotal !== undefined && rawLineTotal !== null && rawLineTotal > 0) {
              lineTotal = Number(rawLineTotal);
              unitPrice =
                rawUnitPrice !== undefined && rawUnitPrice !== null && rawUnitPrice > 0
                  ? Number(rawUnitPrice)
                  : lineTotal / qty;
            } else if (rawUnitPrice !== undefined && rawUnitPrice !== null && rawUnitPrice > 0) {
              unitPrice = Number(rawUnitPrice);
              lineTotal = unitPrice * qty;
            } else if (item.price > 0) {
              unitPrice = item.price;
              lineTotal = item.price * qty;
            }

            return (
              <div key={item.id || `${item.name}-${idx}`} className="py-2.5 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* High-visibility typography for Kitchen KDS vs clean styling for Admin */}
                  {isChef ? (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-brand-green text-brand-gold font-mono font-black text-sm flex items-center justify-center shrink-0 shadow-2xs">
                        {qty} ×
                      </div>
                      <span className="font-extrabold text-brand-green text-sm sm:text-base leading-tight truncate">
                        {itemName}
                      </span>
                    </div>
                  ) : (
                    /* Admin View: Compact clean quantity badge + dish name */
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-brand-green text-brand-beige text-[11px] font-black flex items-center justify-center font-mono shrink-0">
                        {qty}×
                      </span>
                      <span className="font-bold text-brand-green truncate">{itemName}</span>
                    </div>
                  )}

                  {/* Modifiers & Selected Add-ons */}
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <p
                      className={`text-[10px] text-brand-green/60 mt-1 ${
                        isChef ? 'ml-12' : 'ml-7'
                      }`}
                    >
                      {Object.entries(item.selectedOptions)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' • ')}
                    </p>
                  )}
                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                    <p
                      className={`text-[10px] text-brand-gold font-semibold ${
                        isChef ? 'ml-12' : 'ml-7'
                      }`}
                    >
                      Add-ons: {item.selectedAddOns.join(', ')}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p
                      className={`text-[10px] text-amber-700 italic font-medium ${
                        isChef ? 'ml-12' : 'ml-7'
                      }`}
                    >
                      Note: {item.specialInstructions}
                    </p>
                  )}
                </div>

                {/* Admin View ONLY: Unit Price & Line Total */}
                {!isChef && (
                  <div className="text-right shrink-0">
                    <span className="font-mono font-bold text-brand-green text-xs block">
                      ₹{lineTotal.toFixed(0)}
                    </span>
                    {qty > 1 && (
                      <span className="text-[10px] text-brand-green/50 font-mono block">
                        ₹{unitPrice.toFixed(0)} each
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message alert if transition fails */}
      {errorMessage && (
        <div className="mx-3.5 sm:mx-4 mb-2 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="p-3 sm:p-3.5 border-t border-brand-beige-dark/60 bg-brand-beige-light/30 flex items-center justify-between gap-2 flex-wrap">
        {/* Financial info for Admin ONLY / Kitchen summary for Chef */}
        {!isChef ? (
          <div className="shrink-0">
            <span className="text-[10px] uppercase font-bold text-brand-green/40 block leading-tight">
              Total Due
            </span>
            <span className="font-mono font-black text-sm sm:text-base text-brand-green leading-tight">
              ₹{(order.total ?? 0).toFixed(0)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1 shrink-0">
            <Utensils className="w-3.5 h-3.5 text-brand-green/50" />
            <span className="text-xs font-bold text-brand-green/80">
              {totalUnits} items to prepare
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 ml-auto flex-wrap">
          {/* Admin Cancel Button (Only if PLACED) */}
          {!isChef && (order.status === 'PLACED' || order.status === 'ORDER_PLACED') && (
            <>
              {!showCancelPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="px-2.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors min-h-[40px] cursor-pointer"
                  title="Cancel Order"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 p-1 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-[10px] font-bold text-red-700 px-1">Cancel?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      setIsUpdating(true);
                      try {
                        await onUpdateStatus(order.id, 'CANCELLED');
                      } finally {
                        setIsUpdating(false);
                        setShowCancelPrompt(false);
                      }
                    }}
                    className="px-2 py-1 rounded bg-red-600 text-white font-black text-[10px] uppercase shadow-2xs cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCancelPrompt(false)}
                    className="px-2 py-1 rounded bg-white text-gray-700 font-bold text-[10px] border border-gray-200 cursor-pointer"
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}

          {/* Billing Action: Generate Bill */}
          {!isChef && (order.status === 'COMPLETED' || order.status === 'IN_KITCHEN' || order.status === 'SERVED') && onOpenBill && (
            <button
              type="button"
              onClick={() => onOpenBill(order.id)}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[40px] cursor-pointer whitespace-nowrap"
            >
              <Receipt className="w-4 h-4 text-brand-gold shrink-0" />
              <span>{order.paymentStatus === 'PAID' ? 'View Bill' : 'Generate Bill'}</span>
            </button>
          )}

          {/* Sequential Action Button: PLACED -> ACCEPTED -> SERVED -> COMPLETED */}
          {nextAction && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleExecuteAction}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 min-h-[40px] touch-manipulation cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isUpdating ? (
                <span>{nextAction.loadingLabel}</span>
              ) : (
                <>
                  {nextAction.icon}
                  <span>{nextAction.label}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
