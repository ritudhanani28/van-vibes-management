'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '@/types/cafe';
import { useAuth } from '@/context/AuthContext';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Sparkles,
  AlertTriangle,
  Receipt,
  XCircle,
  User,
  Phone,
  Utensils,
  ArrowRight,
  Send,
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
          label: 'Accepted',
          color: 'bg-blue-100 text-blue-900 border-blue-300',
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
  const elapsedMinutes = !isNaN(orderDate.getTime())
    ? Math.max(0, Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60)))
    : 0;

  // Item counts & unit calculations
  const totalUnits = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const uniqueItemsCount = order.items.length;

  // Authoritative Next Action Determination: PLACED -> ACCEPTED -> SERVED -> COMPLETED
  const getNextAction = (
    status: OrderStatus
  ): { target: OrderStatus; label: string; loadingLabel: string; icon: React.ReactNode } | null => {
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
    } catch (err: any) {
      console.error('Failed to transition order status:', err);
      setErrorMessage(err?.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-brand-beige-dark shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      {/* Top Header Strip */}
      <div className="p-3.5 sm:p-4 border-b border-brand-beige-dark/60 bg-brand-beige-light/40 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-base sm:text-lg text-brand-green">
              {order.id}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-green text-brand-beige font-black text-xs font-mono">
              Table {order.tableNumber ?? '--'}
            </span>
            {order.diningSessionId && (
              <span className="px-2 py-0.5 rounded-full bg-brand-beige border border-brand-beige-dark text-brand-green font-bold text-[10px] font-mono">
                {order.diningSessionId}
              </span>
            )}
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Customer details if available */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-brand-green/70 flex-wrap">
            {order.customerName && (
              <span className="flex items-center gap-1 font-semibold">
                <User className="w-3 h-3 text-brand-green/50" />
                {order.customerName}
              </span>
            )}
            {/* Only Admin sees phone number */}
            {!isChef && order.customerMobile && (
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <Phone className="w-3 h-3 text-brand-green/50" />
                +91 {order.customerMobile}
              </span>
            )}
          </div>
        </div>

        {/* Date/Time and Elapsed Time Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg ${
              elapsedMinutes > 20
                ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
                : 'bg-brand-beige text-brand-green border border-brand-beige-dark'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{elapsedMinutes}m ago</span>
          </div>
          {formattedTime && (
            <span className="text-[10px] font-mono text-brand-green/50">
              {formattedTime}
            </span>
          )}
        </div>
      </div>

      {/* Special Kitchen Notes / Instructions Alert */}
      {order.specialInstructions && (
        <div className="mx-3.5 sm:mx-4 mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 flex items-start gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-black uppercase tracking-wider text-[10px] block text-amber-800">
              Kitchen Note:
            </span>
            <p className="font-medium text-xs mt-0.5">{order.specialInstructions}</p>
          </div>
        </div>
      )}

      {/* Itemized Order List */}
      <div className="p-3.5 sm:p-4 space-y-2 flex-1">
        {/* Count summary: Distinctly shows total units and unique dishes */}
        <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-brand-green/60 mb-1">
          <span>Items Ordered</span>
          <span className="font-mono bg-brand-beige px-2 py-0.5 rounded-full text-brand-green border border-brand-beige-dark">
            {totalUnits} {totalUnits === 1 ? 'unit' : 'units'} ({uniqueItemsCount}{' '}
            {uniqueItemsCount === 1 ? 'item' : 'items'})
          </span>
        </div>

        <div className="divide-y divide-brand-beige-dark/40 text-xs">
          {order.items.map((item) => {
            const qty = item.quantity || 1;
            const itemName = item.name || (item as any).item_name || 'Item';

            // Authoritative price calculation from backend data
            const rawUnitPrice =
              (item as any).unitPrice ?? (item as any).unit_price ?? item.price;
            const rawLineTotal =
              (item as any).lineTotal ??
              (item as any).line_total ??
              (item as any).itemTotal ??
              (item as any).item_total;

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
            }

            return (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {/* Chef View: Extra Prominent Quantity Scannable from a distance */}
                  {isChef ? (
                    <div className="flex items-center gap-3">
                      <div className="px-2.5 py-1 rounded-lg bg-brand-green text-brand-gold text-sm font-black flex items-center justify-center font-mono shadow-xs border border-brand-green/40 shrink-0">
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
      <div className="p-3.5 sm:p-4 border-t border-brand-beige-dark/60 bg-brand-beige-light/30 flex items-center justify-between gap-2 flex-wrap">
        {/* Financial info for Admin ONLY / Kitchen summary for Chef */}
        {!isChef ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-brand-green/40 block">
                Total
              </span>
              {order.subtotal && order.subtotal !== order.total && (
                <span className="text-[10px] text-brand-green/50 font-mono">
                  (Subtotal: ₹{order.subtotal.toFixed(0)})
                </span>
              )}
            </div>
            <span className="font-mono font-black text-base text-brand-green">
              ₹{(order.total ?? 0).toFixed(0)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 py-1">
            <Utensils className="w-3.5 h-3.5 text-brand-green/50" />
            <span className="text-xs font-bold text-brand-green/80">
              {totalUnits} items to prepare
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Sequential Action Button: PLACED -> ACCEPTED -> SERVED -> COMPLETED */}
          {nextAction && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleExecuteAction}
              className="px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 min-h-[44px] min-w-[130px] touch-manipulation cursor-pointer disabled:cursor-not-allowed"
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

          {/* Billing Action ONLY when order is COMPLETED */}
          {!isChef && order.status === 'COMPLETED' && onOpenBill && (
            <button
              type="button"
              onClick={() => onOpenBill(order.id)}
              className="px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[44px] cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-brand-gold" />
              <span>{order.paymentStatus === 'PAID' ? 'View Bill' : 'Generate Bill'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
