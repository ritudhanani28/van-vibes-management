'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Order, OrderStatus, OrderItem } from '@/types/cafe';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/api/orders';
import {
  getOrderChefItems,
  isKotItem,
  canCompleteOrder,
  OrderCompletionCheckResult,
} from '@/utils/kot';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  XCircle,
  User,
  Phone,
  Utensils,
  Coffee,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';

const MANAGEMENT_CANCELLATION_REASONS = [
  'Customer requested cancellation',
  'Item unavailable',
  'Kitchen unavailable',
  'Restaurant closed',
  'Duplicate order',
  'Payment issue',
  'Other',
];

interface Props {
  order: Order;
  onUpdateStatus: (orderId: string, nextStatus: OrderStatus) => Promise<void>;
  onOpenBill?: (orderId: string) => void;
  isKitchenView?: boolean;
}

export function OrderCard({ order, onUpdateStatus, onOpenBill, isKitchenView }: Props) {
  const router = useRouter();
  const { role } = useAuth();
  const isChef = role === 'CHEF' || !!isKitchenView;

  // For Kitchen View: only items routed to the chef/kitchen station
  // For Admin View: all order items
  const displayedItems = useMemo(
    () => (isKitchenView ? getOrderChefItems(order) : order.items),
    [order.items, isKitchenView]
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customExplanation, setCustomExplanation] = useState('');
  const [additionalNote, setAdditionalNote] = useState('');
  const [cancelFieldError, setCancelFieldError] = useState<string | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // Chef Item Preparation Checklist & Validation
  const [showPendingWarningModal, setShowPendingWarningModal] = useState(false);
  const [showIncompletePrepModal, setShowIncompletePrepModal] = useState(false);
  const [prepCheckResult, setPrepCheckResult] = useState<OrderCompletionCheckResult | null>(null);

  const getItemKey = useCallback((item: OrderItem, idx: number) => {
    return item.id ? String(item.id) : `item-${idx}-${item.name || item.item_name || "Item"}`;
  }, []);

  const [checkedItemKeys, setCheckedItemKeys] = useState<Set<string>>(() => {
    if (order.status !== "ACCEPTED" && order.status !== "PLACED" && order.status !== "ORDER_PLACED") {
      return new Set(
        displayedItems.map((item, idx) =>
          item.id ? String(item.id) : `item-${idx}-${item.name || item.item_name || "Item"}`
        )
      );
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`chef_prep_items_${order.id}`);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            return new Set(arr);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    return new Set();
  });

  useEffect(() => {
    if (order.status !== "ACCEPTED" && order.status !== "PLACED" && order.status !== "ORDER_PLACED") {
      const allKeys = displayedItems.map((item, idx) => getItemKey(item, idx));
      setCheckedItemKeys((prev) => {
        if (allKeys.length === prev.size && allKeys.every((k) => prev.has(k))) {
          return prev;
        }
        return new Set(allKeys);
      });
      return;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`chef_prep_items_${order.id}`);
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setCheckedItemKeys((prev) => {
              if (arr.length === prev.size && arr.every((k: string) => prev.has(k))) {
                return prev;
              }
              return new Set(arr);
            });
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [order.id, order.status, displayedItems, getItemKey]);

  const toggleItemChecked = (itemKey: string) => {
    if (order.status !== "ACCEPTED") return;
    setCheckedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`chef_prep_items_${order.id}`, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error(e);
        }
      }
      return next;
    });
  };

  const pendingItems = displayedItems.filter((item, idx) => {
    const key = getItemKey(item, idx);
    return !checkedItemKeys.has(key);
  });

  const allItemsChecked = displayedItems.length === 0 || pendingItems.length === 0;
  const checkedCount = displayedItems.length - pendingItems.length;

  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
    setCancelReason('');
    setCustomExplanation('');
    setAdditionalNote('');
    setCancelFieldError(null);
  };

  const handleCloseCancelModal = () => {
    if (!isCancellingOrder) {
      setShowCancelModal(false);
      setCancelReason('');
      setCustomExplanation('');
      setAdditionalNote('');
      setCancelFieldError(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (isCancellingOrder) return;
    if (!cancelReason) {
      setCancelFieldError('Please select a cancellation reason.');
      return;
    }
    if (cancelReason === 'Other' && !customExplanation.trim()) {
      setCancelFieldError('Please specify the reason for cancellation.');
      return;
    }

    setIsCancellingOrder(true);
    setCancelFieldError(null);
    try {
      const finalReason = cancelReason === 'Other' ? customExplanation.trim() : cancelReason;
      const finalNote = additionalNote.trim() || undefined;
      await ordersApi.cancelOrder(order.id, {
        reason: finalReason,
        cancellation_note: finalNote,
        cancelled_by: 'management',
      });
      setShowCancelModal(false);
      await onUpdateStatus(order.id, 'CANCELLED');
    } catch (err: unknown) {
      setCancelFieldError(err instanceof Error ? err.message : 'Failed to cancel order.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const [elapsedMinutes, setElapsedMinutes] = useState(() => {
    if (order.status === 'COMPLETED' || order.status === 'SERVED' || order.status === 'CANCELLED') {
      return 0;
    }
    const orderTime = new Date(order.createdAt).getTime();
    return !isNaN(orderTime) ? Math.max(0, Math.floor((Date.now() - orderTime) / (1000 * 60))) : 0;
  });

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
  const isCompleted =
    order.status === 'COMPLETED' ||
    order.status === 'SERVED' ||
    order.status === 'CANCELLED';

  const orderDate = new Date(order.createdAt);
  const formattedTime = !isNaN(orderDate.getTime())
    ? orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  useEffect(() => {
    if (isCompleted) return;
    const updateElapsed = () => {
      const orderTime = new Date(order.createdAt).getTime();
      if (!isNaN(orderTime)) {
        setElapsedMinutes(Math.max(0, Math.floor((Date.now() - orderTime) / (1000 * 60))));
      }
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt, isCompleted]);

  // Item counts & unit calculations
  const totalUnits = displayedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const uniqueItemsCount = displayedItems.length;

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

  const handleActionClick = () => {
    // If chef view and marking order as Done: must have all items checked!
    if (isChef && nextAction?.label === "Done" && !allItemsChecked) {
      setShowPendingWarningModal(true);
      return;
    }

    // If admin view and completing order: must verify both Chef and KOT are Done!
    if (!isChef && nextAction?.target === "COMPLETED") {
      const check = canCompleteOrder(order);
      if (!check.canComplete) {
        setPrepCheckResult(check);
        setShowIncompletePrepModal(true);
        return;
      }
    }

    handleExecuteAction();
  };

  const handleExecuteAction = async () => {
    if (!nextAction || isUpdating) return;
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      await onUpdateStatus(order.id, nextAction.target);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(`chef_prep_items_${order.id}`);
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update order status";
      console.error("Failed to transition order status:", err);
      setErrorMessage(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // ==========================================
  // 1. KITCHEN KDS VIEW (MIRRORS KOT CARD DESIGN)
  // ==========================================
  if (isKitchenView) {
    return (
      <div className="bg-white rounded-2xl border border-brand-beige-dark shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between h-[460px] sm:h-[490px] max-h-[520px] w-full text-brand-green">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-brand-beige-dark/60 bg-brand-beige-light/40 flex items-start justify-between gap-2 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-sm text-brand-green tracking-wider">
                {order.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  isCompleted
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                {isCompleted ? "Kitchen Ready" : "Incoming Order"}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs font-semibold text-brand-green/70">
              <span className="font-black text-brand-green">
                Table {order.tableNumber || order.tableId || 1}
              </span>
              <span>•</span>
              <span>{order.customerName || "Guest"}</span>
            </div>
          </div>

          {/* Time Elapsed Badge */}
          {!isCompleted ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/80 shrink-0">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span className="text-xs font-mono font-black">
                {elapsedMinutes > 0 ? `${elapsedMinutes}m ago` : "Just now"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Prepared</span>
            </div>
          )}
        </div>

        {/* Main Kitchen Items List */}
        <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-brand-green/70 uppercase tracking-wider pb-1 border-b border-brand-beige-dark/40">
            <span>Chef Checklist ({displayedItems.length} items)</span>
            <span className="font-mono text-brand-green font-extrabold">
              {checkedCount}/{displayedItems.length} checked
            </span>
          </div>

          {displayedItems.length === 0 ? (
            <div className="py-8 text-center text-brand-green/50 text-xs italic">
              No kitchen items found in this order.
            </div>
          ) : (
            displayedItems.map((item, idx) => {
              const key = getItemKey(item, idx);
              const isChecked = checkedItemKeys.has(key);

              return (
                <div
                  key={key}
                  onClick={() => order.status === "ACCEPTED" && toggleItemChecked(key)}
                  className={`p-2.5 rounded-xl border transition-all select-none ${
                    order.status === "ACCEPTED" ? "cursor-pointer" : ""
                  } ${
                    isChecked
                      ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-950"
                      : "bg-white border-brand-beige-dark/70 hover:bg-brand-beige-light/60 text-brand-green"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={order.status !== "ACCEPTED"}
                        onChange={() => toggleItemChecked(key)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded text-brand-green focus:ring-brand-gold accent-brand-green cursor-pointer"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-extrabold truncate ${
                            isChecked ? "line-through text-emerald-800/70" : "text-brand-green"
                          }`}
                        >
                          {item.quantity || 1} × {item.name || item.item_name || "Item"}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-brand-green/50 shrink-0">
                          {item.category ? item.category.replace("-", " ") : "Kitchen"}
                        </span>
                      </div>

                      {/* Modifiers & Selected Add-ons */}
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <p className="text-[10px] text-brand-green/60 mt-0.5 truncate">
                          {Object.entries(item.selectedOptions)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" • ")}
                        </p>
                      )}
                      {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                        <p className="text-[10px] text-brand-gold font-semibold truncate">
                          Add-ons: {item.selectedAddOns.join(", ")}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-[10px] text-amber-700 italic font-medium mt-0.5">
                          Note: {item.specialInstructions}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Customer Special Note */}
          {order.specialInstructions && (
            <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs">
              <span className="font-bold block text-[10px] uppercase text-amber-800">
                Customer Note:
              </span>
              <span className="italic">{order.specialInstructions}</span>
            </div>
          )}
        </div>

        {/* Error message alert */}
        {errorMessage && (
          <div className="mx-3.5 sm:mx-4 mb-2 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5 shrink-0">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Bottom Footer & Done Action */}
        <div className="p-3.5 sm:p-4 border-t border-brand-beige-dark/60 bg-brand-beige-light/30 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-brand-green/80">
            <div className="flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-brand-green/60" />
              <span>
                {allItemsChecked ? (
                  <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> All {displayedItems.length} items ready
                  </span>
                ) : (
                  <span>
                    {checkedCount}/{displayedItems.length} prepared ({pendingItems.length} left)
                  </span>
                )}
              </span>
            </div>
            <span className="font-mono text-brand-green/60 text-[11px]">
              {totalUnits} units
            </span>
          </div>

          {/* Chef Done Action */}
          {order.status === "ACCEPTED" && nextAction && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleActionClick}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer min-h-[40px] ${
                allItemsChecked
                  ? "bg-brand-green hover:bg-brand-green-hover text-brand-beige"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {isUpdating ? (
                <span>{nextAction.loadingLabel}</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Done</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Chef Incomplete Preparation Warning Modal */}
        {showPendingWarningModal && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setShowPendingWarningModal(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-brand-green"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-lg text-brand-green leading-tight">
                    Incomplete Order Preparation
                  </h4>
                  <p className="text-xs text-brand-green/60 font-mono mt-0.5">
                    Order #{order.id} • Table {order.tableNumber || order.tableId || 1}
                  </p>
                </div>
              </div>

              {/* Warning Banner Message */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1.5">
                <p className="font-black text-amber-900 text-sm flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Please complete all items before marking the order as Done!
                </p>
                <p className="text-amber-800 leading-relaxed font-medium">
                  All items in this order must be prepared and checked off before marking the order as Done.
                  Please verify and tick all remaining items first.
                </p>
              </div>

              {/* Pending Items List */}
              <div className="space-y-2 text-left">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-brand-green/70">
                  <span>Remaining Items ({pendingItems.length})</span>
                  <span className="text-amber-800 font-mono font-extrabold">
                    {checkedCount} of {displayedItems.length} completed
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-brand-beige-light/40 border border-brand-beige-dark/60 text-xs">
                  {pendingItems.map((item, idx) => (
                    <div
                      key={getItemKey(item, idx)}
                      onClick={() => toggleItemChecked(getItemKey(item, idx))}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-amber-200/80 text-brand-green hover:bg-amber-50 cursor-pointer transition-colors shadow-2xs"
                      title="Click to mark this item ready"
                    >
                      <span className="font-extrabold flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        {(item.quantity || 1)} × {item.name || item.item_name || "Item"}
                      </span>
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                        Tick to Ready
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPendingWarningModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[42px]"
                >
                  <span>Back to Preparation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 2. ADMIN VIEW (DASHBOARD & ORDERS PAGE)
  // ==========================================
  return (
    <div className="bg-white rounded-2xl border border-brand-beige-dark shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between h-[460px] sm:h-[490px] max-h-[520px] w-full">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-brand-beige-dark/60 bg-brand-beige-light/40 flex items-start justify-between gap-2 shrink-0">
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
            {!isCompleted && elapsedMinutes > 0 && (
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
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 border ${
            order.paymentStatus === 'PAID'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {order.paymentStatus || 'PENDING'}
        </span>
      </div>

      {/* Customer Info & Notes */}
      <div className="px-3.5 sm:px-4 pt-3 space-y-2 shrink-0">
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

        {/* Cancellation Audit Information */}
        {order.status === 'CANCELLED' && (
          <div className="p-3 rounded-2xl bg-red-50/90 border border-red-200/90 text-red-950 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold uppercase text-[10px] tracking-wider text-red-800">
                Order Cancelled
              </span>
              {(order.cancelledAt || order.cancelled_at) && (
                <span className="font-mono text-[11px] text-red-700 font-bold">
                  Cancelled at {new Date(order.cancelledAt || order.cancelled_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="pt-1 border-t border-red-200/60 space-y-1">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-red-900 text-[11px] uppercase tracking-wide">
                  Cancelled by:
                </span>
                <span className="font-semibold text-red-950 capitalize">
                  {(() => {
                    const by = (order.cancelledBy || order.cancelled_by || '').toLowerCase();
                    return by === 'customer' ? 'Customer' : 'Management';
                  })()}
                </span>
              </div>
              {(order.cancellationReason || order.cancellation_reason) && (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-red-900 text-[11px] uppercase tracking-wide">
                    Reason:
                  </span>
                  <span className="font-medium text-red-900">
                    {order.cancellationReason || order.cancellation_reason}
                  </span>
                </div>
              )}
              {(order.cancellationNote || order.cancellation_note) && (
                <div className="text-[11px] text-red-800/90 italic">
                  Note: {order.cancellationNote || order.cancellation_note}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Order Items List */}
      <div className="px-3.5 sm:px-4 py-2.5 flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between text-[11px] font-bold pb-2 border-b border-brand-beige-dark/40 mb-1.5 shrink-0">
          <span className="text-brand-green/60 uppercase tracking-wider">Items Ordered</span>
          <span className="font-mono text-brand-green/50">
            {totalUnits} {totalUnits === 1 ? "unit" : "units"} ({uniqueItemsCount}{" "}
            {uniqueItemsCount === 1 ? "item" : "items"})
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-brand-beige-dark/40 text-xs">
          {displayedItems.map((item, idx) => {
            const qty = item.quantity || 1;
            const itemName = item.name || item.item_name || "Item";
            const itemKey = getItemKey(item, idx);

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
              <div
                key={itemKey}
                className="py-2.5 flex items-start justify-between gap-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-brand-green text-brand-beige text-[11px] font-black flex items-center justify-center font-mono shrink-0">
                      {qty}×
                    </span>
                    <span className="font-bold text-brand-green truncate">{itemName}</span>
                  </div>

                  {/* Modifiers & Selected Add-ons */}
                  {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                    <p className="text-[10px] text-brand-green/60 mt-1 ml-7">
                      {Object.entries(item.selectedOptions)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" • ")}
                    </p>
                  )}
                  {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                    <p className="text-[10px] text-brand-gold font-semibold ml-7">
                      Add-ons: {item.selectedAddOns.join(", ")}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="text-[10px] text-amber-700 italic font-medium ml-7">
                      Note: {item.specialInstructions}
                    </p>
                  )}
                </div>

                {/* Admin View: Station Badge + Unit Price & Line Total */}
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide ${
                        isKotItem(item)
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {isKotItem(item) ? "KOT" : "Kitchen"}
                    </span>
                    <span className="font-mono font-bold text-brand-green text-xs">
                      ₹{lineTotal.toFixed(0)}
                    </span>
                  </div>
                  {qty > 1 && (
                    <span className="text-[10px] text-brand-green/50 font-mono block">
                      ₹{unitPrice.toFixed(0)} each
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message alert if transition fails */}
      {errorMessage && (
        <div className="mx-3.5 sm:mx-4 mb-2 p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5 shrink-0">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Bottom Action Footer */}
      <div className="p-3 sm:p-3.5 border-t border-brand-beige-dark/60 bg-brand-beige-light/30 flex items-center justify-between gap-2 flex-wrap shrink-0 mt-auto">
        <div className="shrink-0">
          <span className="text-[10px] uppercase font-bold text-brand-green/40 block leading-tight">
            Total Due
          </span>
          <span className="font-mono font-black text-sm sm:text-base text-brand-green leading-tight">
            ₹{(order.total ?? 0).toFixed(0)}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Cancel Order Action */}
          {order.status === 'PLACED' && (
            <button
              type="button"
              onClick={handleOpenCancelModal}
              className="px-2.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors min-h-[40px] cursor-pointer flex items-center gap-1"
              title="Cancel Order"
            >
              <XCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}

          {/* Billing Action: Generate Bill */}
          {onOpenBill && order.status !== 'CANCELLED' && (
            <button
              type="button"
              onClick={() => onOpenBill(order.id)}
              className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[40px] cursor-pointer whitespace-nowrap"
            >
              <Receipt className="w-4 h-4 text-brand-gold shrink-0" />
              <span>{order.paymentStatus === 'PAID' ? 'View Bill' : 'Generate Bill'}</span>
            </button>
          )}

          {/* Sequential Action Button: PLACED -> ACCEPTED -> COMPLETED */}
          {nextAction && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={handleActionClick}
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

      {/* Admin Incomplete Preparation Warning Modal (Blocks Complete Order until Chef & KOT are Done) */}
      {showIncompletePrepModal && prepCheckResult && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowIncompletePrepModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-brand-green"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-lg text-brand-green leading-tight">
                  Order Preparation Incomplete
                </h4>
                <p className="text-xs text-brand-green/60 font-mono mt-0.5">
                  Order #{order.id} • Table {order.tableNumber || order.tableId || 1}
                </p>
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1.5">
              <p className="font-black text-amber-900 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Preparation pending before order can be completed!
              </p>
              <p className="text-amber-800 leading-relaxed font-medium">
                {prepCheckResult.isChefPending && prepCheckResult.isKotPending
                  ? "Both Kitchen food items and KOT beverage/dessert items are still pending preparation. All stations must mark their items as Done first."
                  : prepCheckResult.isChefPending
                  ? "Kitchen food items are still being prepared. The Chef must mark them as Done in the Kitchen KDS first."
                  : "KOT beverage & dessert items are still being prepared. The items must be marked as Done in the KOT station first."}
              </p>
            </div>

            {/* Pending Sections Breakdown */}
            <div className="space-y-3 text-left">
              {prepCheckResult.isChefPending && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Utensils className="w-3.5 h-3.5 text-amber-600" />
                      Kitchen Items ({prepCheckResult.pendingChefItems.length})
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-extrabold">
                      Chef Pending
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-xl bg-brand-beige-light/40 border border-brand-beige-dark/60 text-xs">
                    {prepCheckResult.pendingChefItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-amber-200/60">
                        <span className="font-extrabold text-brand-green">
                          {(item.quantity || 1)} × {item.name || item.item_name || "Item"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prepCheckResult.isKotPending && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-amber-600" />
                      KOT Items ({prepCheckResult.pendingKotItems.length})
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-extrabold">
                      KOT Pending
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 p-2 rounded-xl bg-brand-beige-light/40 border border-brand-beige-dark/60 text-xs">
                    {prepCheckResult.pendingKotItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-amber-200/60">
                        <span className="font-extrabold text-brand-green">
                          {(item.quantity || 1)} × {item.name || item.item_name || "Item"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center gap-2 pt-2 flex-wrap">
              {prepCheckResult.isKotPending && (
                <button
                  type="button"
                  onClick={() => {
                    setShowIncompletePrepModal(false);
                    router.push("/kot");
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Go to KOT Station</span>
                </button>
              )}
              {prepCheckResult.isChefPending && (
                <button
                  type="button"
                  onClick={() => {
                    setShowIncompletePrepModal(false);
                    router.push("/chef");
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 min-h-[40px]"
                >
                  <Utensils className="w-3.5 h-3.5 text-brand-gold" />
                  <span>Go to Kitchen KDS</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowIncompletePrepModal(false)}
                className="py-2.5 px-4 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green font-bold text-xs transition-all cursor-pointer min-h-[40px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Management Custom Cancellation Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={handleCloseCancelModal}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-brand-beige-dark overflow-hidden p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150 text-brand-green"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-lg text-brand-green leading-tight">
                  Cancel Order
                </h4>
                <p className="text-xs text-brand-green/60 font-mono mt-0.5">
                  Order #{order.id} • Table {order.tableNumber}
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {cancelFieldError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed">{cancelFieldError}</span>
              </div>
            )}

            <p className="text-xs text-brand-green/70 leading-relaxed">
              Are you sure you want to cancel this order?
            </p>

            {/* Reason Selection */}
            <div className="space-y-1.5 text-left">
              <label className="text-[11px] font-bold text-brand-green/80 uppercase tracking-wide block">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  setCancelFieldError(null);
                }}
                disabled={isCancellingOrder}
                className="w-full px-3 py-2.5 rounded-xl border border-brand-beige-dark bg-brand-beige-light/50 text-brand-green text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-green/30 cursor-pointer"
              >
                <option value="">Select reason...</option>
                {MANAGEMENT_CANCELLATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom explanation if Other */}
            {cancelReason === 'Other' && (
              <div className="space-y-1 text-left animate-in fade-in duration-150">
                <label className="text-[11px] font-bold text-brand-green/80 uppercase tracking-wide block">
                  Custom Explanation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customExplanation}
                  onChange={(e) => {
                    setCustomExplanation(e.target.value);
                    setCancelFieldError(null);
                  }}
                  disabled={isCancellingOrder}
                  placeholder="Specify reason..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark bg-brand-beige-light/50 text-brand-green text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/30 resize-none"
                />
              </div>
            )}

            {/* Additional Note (Optional) */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-brand-green/80 uppercase tracking-wide block">
                Additional Note <span className="text-brand-green/40 text-[10px] font-normal">(Optional)</span>
              </label>
              <textarea
                value={additionalNote}
                onChange={(e) => setAdditionalNote(e.target.value)}
                disabled={isCancellingOrder}
                placeholder="Optional explanation..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark bg-brand-beige-light/50 text-brand-green text-xs focus:outline-none focus:ring-2 focus:ring-brand-green/30 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isCancellingOrder}
                onClick={handleCloseCancelModal}
                className="flex-1 py-2.5 px-4 rounded-xl border border-brand-beige-dark font-bold text-xs text-brand-green/70 hover:bg-brand-beige transition-colors disabled:opacity-50 cursor-pointer min-h-[40px]"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isCancellingOrder}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
              >
                {isCancellingOrder ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
