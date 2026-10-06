'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Order, OrderItem } from "@/types/cafe";
import {
  getOrderKotItems,
  isKotOrderDone,
  setKotOrderDone,
  KOT_PREP_PREFIX,
} from "@/utils/kot";
import {
  Coffee,
  CheckCircle2,
  Clock,
  Printer,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Check,
} from "lucide-react";

interface Props {
  order: Order;
  onPrint: (order: Order) => void;
  onKotDone?: (orderId: string) => void;
  onReopenKot?: (orderId: string) => void;
  isCompletedTab?: boolean;
}

export function KotCard({
  order,
  onPrint,
  onKotDone,
  onReopenKot,
  isCompletedTab = false,
}: Props) {
  const kotItems = useMemo(() => getOrderKotItems(order), [order.items]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const getItemKey = useCallback((item: OrderItem, idx: number) => {
    return item.id ? String(item.id) : `kot-${idx}-${item.name || item.item_name || "Item"}`;
  }, []);

  // Checked items checklist state
  const [checkedItemKeys, setCheckedItemKeys] = useState<Set<string>>(() => {
    if (isCompletedTab || isKotOrderDone(order.id)) {
      return new Set(kotItems.map((item, idx) => getItemKey(item, idx)));
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`${KOT_PREP_PREFIX}${order.id}`);
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
    if (isCompletedTab || isKotOrderDone(order.id)) {
      const allKeys = kotItems.map((item, idx) => getItemKey(item, idx));
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
        const raw = localStorage.getItem(`${KOT_PREP_PREFIX}${order.id}`);
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
  }, [order.id, isCompletedTab, kotItems, getItemKey]);

  const toggleItemChecked = (itemKey: string) => {
    if (isCompletedTab) return;
    setCheckedItemKeys((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${KOT_PREP_PREFIX}${order.id}`, JSON.stringify(Array.from(next)));
        } catch (e) {
          console.error(e);
        }
      }
      return next;
    });
  };

  const pendingItems = kotItems.filter((item, idx) => {
    const key = getItemKey(item, idx);
    return !checkedItemKeys.has(key);
  });

  const allItemsChecked = kotItems.length === 0 || pendingItems.length === 0;
  const checkedCount = kotItems.length - pendingItems.length;

  // Elapsed time calculation
  const [elapsedMinutes, setElapsedMinutes] = useState(() => {
    const orderTime = new Date(order.createdAt).getTime();
    return !isNaN(orderTime) ? Math.max(0, Math.floor((Date.now() - orderTime) / (1000 * 60))) : 0;
  });

  useEffect(() => {
    if (isCompletedTab) return;
    const updateElapsed = () => {
      const orderTime = new Date(order.createdAt).getTime();
      if (!isNaN(orderTime)) {
        setElapsedMinutes(Math.max(0, Math.floor((Date.now() - orderTime) / (1000 * 60))));
      }
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt, isCompletedTab]);

  const handleDoneClick = () => {
    if (!allItemsChecked) {
      setShowWarningModal(true);
      return;
    }
    setKotOrderDone(order.id, true);
    if (onKotDone) {
      onKotDone(order.id);
    }
  };

  const handleReopenClick = () => {
    setKotOrderDone(order.id, false);
    if (onReopenKot) {
      onReopenKot(order.id);
    }
  };

  const totalKotUnits = kotItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <div className="bg-white rounded-2xl border border-brand-beige-dark shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between h-[460px] sm:h-[490px] max-h-[520px] w-full text-brand-green">
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 border-b border-brand-beige-dark/60 bg-brand-beige-light/40 flex items-start justify-between gap-2 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-black text-sm text-brand-green tracking-wider">
              {order.id}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
              {isCompletedTab ? "KOT Ready" : "Incoming KOT"}
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
        {!isCompletedTab ? (
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

      {/* Main KOT Items List */}
      <div className="p-3.5 sm:p-4 overflow-y-auto flex-1 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-brand-green/70 uppercase tracking-wider pb-1 border-b border-brand-beige-dark/40">
          <span>Barista Checklist ({kotItems.length} items)</span>
          <span className="font-mono text-brand-green font-extrabold">
            {checkedCount}/{kotItems.length} checked
          </span>
        </div>

        {kotItems.length === 0 ? (
          <div className="py-8 text-center text-brand-green/50 text-xs italic">
            No beverage or dessert items found in this order.
          </div>
        ) : (
          kotItems.map((item, idx) => {
            const key = getItemKey(item, idx);
            const isChecked = checkedItemKeys.has(key);

            return (
              <div
                key={key}
                onClick={() => toggleItemChecked(key)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
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
                      disabled={isCompletedTab}
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
                        {item.category ? item.category.replace("-", " ") : "KOT"}
                      </span>
                    </div>

                    {/* Modifiers & Add-ons */}
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

      {/* Bottom Footer & Action Buttons */}
      <div className="p-3.5 sm:p-4 border-t border-brand-beige-dark/60 bg-brand-beige-light/30 shrink-0 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-brand-green/80">
          <div className="flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-brand-gold" />
            <span>
              {allItemsChecked ? (
                <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> All {kotItems.length} items ready
                </span>
              ) : (
                <span>
                  {checkedCount}/{kotItems.length} prepared ({pendingItems.length} left)
                </span>
              )}
            </span>
          </div>
          <span className="font-mono text-brand-green/60 text-[11px]">
            {totalKotUnits} units
          </span>
        </div>

        <div className="flex items-center gap-2 pt-1">
          {/* Print KOT Button */}
          <button
            type="button"
            onClick={() => onPrint(order)}
            className="flex-1 py-2 px-3 rounded-xl border border-brand-beige-dark hover:bg-white bg-brand-beige-light/60 text-brand-green font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Print KOT Slip"
          >
            <Printer className="w-3.5 h-3.5 text-brand-gold" />
            <span>Print KOT</span>
          </button>

          {/* Done / Reopen Action */}
          {!isCompletedTab ? (
            <button
              type="button"
              onClick={handleDoneClick}
              className={`flex-1 py-2 px-3 rounded-xl font-black text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                allItemsChecked
                  ? "bg-brand-green hover:bg-brand-green-hover text-brand-beige"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Done</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopenClick}
              className="py-2 px-3 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              title="Reopen this ticket"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-green/60" />
              <span>Reopen</span>
            </button>
          )}
        </div>
      </div>

      {/* Incomplete KOT Preparation Warning Modal */}
      {showWarningModal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowWarningModal(false)}
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
                  Incomplete KOT Preparation
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
                Please complete all KOT items before marking as Done!
              </p>
              <p className="text-amber-800 leading-relaxed font-medium">
                All beverage and dessert items in this ticket must be prepared and checked off before marking KOT as Done.
                Please tick all remaining items first.
              </p>
            </div>

            {/* Pending Items List */}
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-brand-green/70">
                <span>Remaining Items ({pendingItems.length})</span>
                <span className="text-amber-800 font-mono font-extrabold">
                  {checkedCount} of {kotItems.length} completed
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-brand-beige-light/40 border border-brand-beige-dark/60 text-xs">
                {pendingItems.map((item, idx) => (
                  <div
                    key={getItemKey(item, idx)}
                    onClick={() => toggleItemChecked(getItemKey(item, idx))}
                    className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-amber-200/80 text-brand-green hover:bg-amber-50 cursor-pointer transition-colors shadow-2xs"
                    title="Click to check this item"
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
                onClick={() => setShowWarningModal(false)}
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
