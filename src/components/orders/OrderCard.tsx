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
  ArrowRight,
  User,
  Phone,
} from 'lucide-react';

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  onOpenBill?: (orderId: string) => void;
}

export function OrderCard({ order, onUpdateStatus, onOpenBill }: Props) {
  const { role } = useAuth();
  const isChef = role === 'CHEF';
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'ORDER_PLACED':
        return {
          label: 'Order Placed',
          color: 'bg-amber-100 text-amber-900 border-amber-300',
        };
      case 'ACCEPTED':
        return {
          label: 'Accepted',
          color: 'bg-blue-100 text-blue-900 border-blue-300',
        };
      case 'PREPARING':
        return {
          label: 'Preparing',
          color: 'bg-yellow-100 text-yellow-900 border-yellow-300',
        };
      case 'READY':
        return {
          label: 'Ready for Service',
          color: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        };
      case 'SERVED':
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
  const elapsedMinutes = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60)
  );

  const handleNextAction = async () => {
    let next: OrderStatus | null = null;
    if (order.status === 'ORDER_PLACED') next = 'ACCEPTED';
    else if (order.status === 'ACCEPTED') next = 'PREPARING';
    else if (order.status === 'PREPARING') next = 'READY';
    else if (order.status === 'READY') next = 'COMPLETED';

    if (next) {
      setIsUpdating(true);
      await onUpdateStatus(order.id, next);
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
              Table {order.tableNumber.toString().padStart(2, '0')}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Customer details if available */}
          {(order.customerName || order.customerMobile) && (
            <div className="flex items-center gap-3 mt-1 text-[11px] text-brand-green/70 flex-wrap">
              {order.customerName && (
                <span className="flex items-center gap-1 font-semibold">
                  <User className="w-3 h-3 text-brand-green/50" />
                  {order.customerName}
                </span>
              )}
              {order.customerMobile && (
                <span className="flex items-center gap-1 font-mono text-[10px]">
                  <Phone className="w-3 h-3 text-brand-green/50" />
                  {order.customerMobile}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Time Elapsed Badge */}
        <div
          className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
            elapsedMinutes > 20
              ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse'
              : 'bg-brand-beige text-brand-green border border-brand-beige-dark'
          }`}
        >
          <Clock className="w-3 h-3" />
          <span>{elapsedMinutes}m ago</span>
        </div>
      </div>

      {/* Special Instructions Alert Box */}
      {order.specialInstructions && (
        <div className="mx-3.5 sm:mx-4 mt-3 p-2.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 flex items-start gap-2 text-xs">
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
        <p className="text-[10px] uppercase font-black tracking-wider text-brand-green/50 mb-1">
          Items Ordered ({order.items.reduce((s, i) => s + i.quantity, 0)})
        </p>
        <div className="divide-y divide-brand-beige-dark/40 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-brand-green text-brand-beige text-[11px] font-black flex items-center justify-center font-mono shrink-0">
                    {item.quantity}×
                  </span>
                  <span className="font-bold text-brand-green truncate">{item.name}</span>
                </div>
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <p className="text-[10px] text-brand-green/60 ml-7 mt-0.5">
                    {Object.entries(item.selectedOptions)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' • ')}
                  </p>
                )}
                {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                  <p className="text-[10px] text-brand-gold ml-7">
                    Add-ons: {item.selectedAddOns.join(', ')}
                  </p>
                )}
              </div>
              <span className="font-mono font-bold text-brand-green text-xs shrink-0">
                ₹{(item.price * item.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="p-3.5 sm:p-4 border-t border-brand-beige-dark/60 bg-brand-beige-light/30 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span className="text-[10px] uppercase font-bold text-brand-green/40 block">
            Total Amount
          </span>
          <span className="font-mono font-black text-base text-brand-green">
            ₹{order.total.toFixed(0)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenBill && (
            <button
              type="button"
              onClick={() => onOpenBill(order.id)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-brand-beige text-brand-green font-bold text-xs border border-brand-beige-dark shadow-2xs flex items-center gap-1.5 transition-all min-h-[40px]"
              title="View Invoice & Receipt"
            >
              <Receipt className="w-3.5 h-3.5 text-brand-gold" />
              <span>Bill</span>
            </button>
          )}

          {/* Admin Cancel Button */}
          {!isChef && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <>
              {!showCancelPrompt ? (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="px-2.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors min-h-[40px]"
                  title="Cancel Order"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex items-center gap-1 p-1 bg-red-50 rounded-xl border border-red-200">
                  <span className="text-[10px] font-bold text-red-700 px-1">Cancel?</span>
                  <button
                    onClick={async () => {
                      setIsUpdating(true);
                      await onUpdateStatus(order.id, 'CANCELLED');
                      setIsUpdating(false);
                      setShowCancelPrompt(false);
                    }}
                    className="px-2 py-1 rounded bg-red-600 text-white font-black text-[10px] uppercase shadow-2xs"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setShowCancelPrompt(false)}
                    className="px-2 py-1 rounded bg-white text-gray-700 font-bold text-[10px] border border-gray-200"
                  >
                    No
                  </button>
                </div>
              )}
            </>
          )}

          {/* Chef / Kitchen Primary Action Button */}
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleNextAction}
              className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 min-h-[40px]"
            >
              {isUpdating ? (
                <span>Updating...</span>
              ) : order.status === 'ORDER_PLACED' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-brand-gold" />
                  <span>Accept Order</span>
                </>
              ) : order.status === 'ACCEPTED' ? (
                <>
                  <ChefHat className="w-4 h-4 text-brand-gold" />
                  <span>Start Prep</span>
                </>
              ) : order.status === 'PREPARING' ? (
                <>
                  <Sparkles className="w-4 h-4 text-brand-gold" />
                  <span>Mark Ready</span>
                </>
              ) : order.status === 'READY' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Complete & Served</span>
                </>
              ) : null}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
