'use client';
import { CAFE_BRAND } from '@/constants/brand';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BillData, IncompleteOrderItem } from '@/types/cafe';
import { calculateBillBreakdown } from '@/utils/billing';
import { billingApi } from '@/api/billing';
import { ApiError } from '@/api/client';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  FileText,
  Printer,
  X,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Sparkles,
  Coins,
  Eye,
} from 'lucide-react';

interface Props {
  orderId?: string | null;
  sessionId?: string | null;
  onClose: () => void;
  onSettled?: () => void;
}

export function BillModal({ orderId, sessionId, onClose, onSettled }: Props) {
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Independent Bill-level Discount State
  const [applyDiscountChecked, setApplyDiscountChecked] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Independent Bill-level Extra Charge State
  const [applyExtraChargeChecked, setApplyExtraChargeChecked] = useState(false);
  const [extraChargeInput, setExtraChargeInput] = useState('');
  const [appliedExtraCharge, setAppliedExtraCharge] = useState<number>(0);
  const [extraChargeError, setExtraChargeError] = useState<string | null>(null);

  const router = useRouter();
  const [isGeneratingFinalBill, setIsGeneratingFinalBill] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showIncompleteWarningModal, setShowIncompleteWarningModal] = useState(false);
  const [incompleteOrdersList, setIncompleteOrdersList] = useState<IncompleteOrderItem[]>([]);
  const [isSettling, setIsSettling] = useState(false);

  useEffect(() => {
    let active = true;
    if (!sessionId && !orderId) return;

    const loadReceipt = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: BillData;
        if (sessionId) {
          data = await billingApi.getSessionReceipt(sessionId);
        } else if (orderId) {
          data = await billingApi.getBillReceipt(orderId);
        } else {
          return;
        }
        if (!active) return;
        setBill(data);
        if (data.incompleteOrders) {
          setIncompleteOrdersList(data.incompleteOrders);
        }

        const initialDisc = data.discountPercentage || (data.discountAmount && data.subtotal > 0 ? Math.round((data.discountAmount / data.subtotal) * 100) : 0);
        const initialExtra = data.extraCharge || 0;

        setAppliedDiscount(initialDisc);
        setDiscountInput(initialDisc > 0 ? initialDisc.toString() : "");
        setApplyDiscountChecked(false);

        setAppliedExtraCharge(initialExtra);
        setExtraChargeInput(initialExtra > 0 ? initialExtra.toString() : "");
        setApplyExtraChargeChecked(false);
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Error loading invoice receipt";
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadReceipt();

    // WebSocket real-time subscription to refresh order completion status
    const handleOrderEvent = () => {
      if (!sessionId && !orderId) return;
      const refreshReceipt = async () => {
        try {
          let updated: BillData;
          if (sessionId) {
            updated = await billingApi.getSessionReceipt(sessionId);
          } else if (orderId) {
            updated = await billingApi.getBillReceipt(orderId);
          } else {
            return;
          }
          if (!active) return;
          setBill(updated);
          if (updated.incompleteOrders) {
            setIncompleteOrdersList(updated.incompleteOrders);
            if (!updated.hasIncompleteOrders || updated.incompleteOrders.length === 0) {
              setShowIncompleteWarningModal(false);
            }
          }
        } catch {
          // Ignore background reload errors
        }
      };
      void refreshReceipt();
    };

    const unsubPlaced = wsManager.on('ORDER_PLACED', handleOrderEvent);
    const unsubAccepted = wsManager.on('ORDER_ACCEPTED', handleOrderEvent);
    const unsubInKitchen = wsManager.on('ORDER_IN_KITCHEN', handleOrderEvent);
    const unsubServed = wsManager.on('ORDER_SERVED', handleOrderEvent);
    const unsubCompleted = wsManager.on('ORDER_COMPLETED', handleOrderEvent);
    const unsubUpdated = wsManager.on('ORDER_STATUS_UPDATED', handleOrderEvent);

    return () => {
      active = false;
      unsubPlaced();
      unsubAccepted();
      unsubInKitchen();
      unsubServed();
      unsubCompleted();
      unsubUpdated();
    };
  }, [sessionId, orderId]);

  // Apply Discount: updates discount only, unchecks & closes only discount box, keeps buttons visible
  const handleApplyDiscount = (percentage: number) => {
    if (!bill) return;

    if (percentage < 0 || percentage > 100) {
      setDiscountError('Discount percentage must be between 0 and 100%.');
      return;
    }

    setDiscountError(null);
    setAppliedDiscount(percentage);
    setDiscountInput(percentage > 0 ? percentage.toString() : '');
    // Automatically remove tick from discount checkbox to close ONLY this box
    setApplyDiscountChecked(false);

    // Update bill totals preview
    setBill((prev) => {
      if (!prev) return prev;
      const breakdown = calculateBillBreakdown(prev.subtotal || 0, percentage, appliedExtraCharge);
      return {
        ...prev,
        discountPercentage: breakdown.discountPercentage,
        discountAmount: breakdown.discountAmount,
        extraCharge: breakdown.extraCharge,
        amountAfterAdjustments: breakdown.amountAfterAdjustments,
        roundOff: breakdown.roundOff,
        total: breakdown.total,
      };
    });
  };

  const handleApplyClick = () => {
    const parsed = parseFloat(discountInput.trim());
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setDiscountError('Discount percentage must be between 0 and 100%.');
      return;
    }
    handleApplyDiscount(parsed);
  };

  // Apply Extra Charge: updates extra charge only, unchecks & closes only extra charge box, keeps buttons visible
  const handleApplyExtraCharge = (amount: number) => {
    if (!bill) return;

    if (amount < 0) {
      setExtraChargeError('Extra charge amount cannot be negative.');
      return;
    }

    setExtraChargeError(null);
    setAppliedExtraCharge(amount);
    setExtraChargeInput(amount > 0 ? amount.toString() : '');
    // Automatically remove tick from extra charge checkbox to close ONLY this box
    setApplyExtraChargeChecked(false);

    // Update bill totals preview
    setBill((prev) => {
      if (!prev) return prev;
      const breakdown = calculateBillBreakdown(prev.subtotal || 0, appliedDiscount || 0, amount);
      return {
        ...prev,
        discountPercentage: breakdown.discountPercentage,
        discountAmount: breakdown.discountAmount,
        extraCharge: breakdown.extraCharge,
        amountAfterAdjustments: breakdown.amountAfterAdjustments,
        roundOff: breakdown.roundOff,
        total: breakdown.total,
      };
    });
  };

  const handleApplyExtraChargeClick = () => {
    const parsed = parseFloat(extraChargeInput.trim());
    if (isNaN(parsed) || parsed < 0) {
      setExtraChargeError('Please enter a valid extra charge amount in Rupees (₹).');
      return;
    }
    handleApplyExtraCharge(parsed);
  };

  // Check order completion before proceeding to bill generation
  const handleInitiateGenerateBill = () => {
    const hasIncomplete =
      (bill?.hasIncompleteOrders && bill?.incompleteOrders && bill.incompleteOrders.length > 0) ||
      incompleteOrdersList.length > 0;

    if (hasIncomplete) {
      if (bill?.incompleteOrders && bill.incompleteOrders.length > 0) {
        setIncompleteOrdersList(bill.incompleteOrders);
      }
      setShowIncompleteWarningModal(true);
      return;
    }
    setShowConfirmModal(true);
  };

  const handleReviewOrders = () => {
    setShowIncompleteWarningModal(false);
    onClose();
    router.push('/orders');
  };

  // Generate Final Bill: Official transition. AFTER this, discount and extra charge are hidden.
  const handleGenerateFinalBill = async () => {
    if (!bill) return;
    setIsGeneratingFinalBill(true);
    setError(null);
    try {
      const finalDiscount = appliedDiscount;
      const finalExtraCharge = appliedExtraCharge;

      let updatedBill: BillData;
      const targetSessionId = sessionId || bill.diningSessionId;
      if (targetSessionId) {
        updatedBill = await billingApi.generateSessionBill(targetSessionId, finalDiscount, finalExtraCharge);
      } else if (orderId) {
        updatedBill = await billingApi.generateBill(orderId, finalDiscount, finalExtraCharge);
      } else {
        return;
      }
      setBill(updatedBill);
      setShowConfirmModal(false);
      onSettled?.();
    } catch (err: unknown) {
      if (err instanceof ApiError && (err.code === 'SESSION_ORDERS_INCOMPLETE' || err.statusCode === 409)) {
        if (err.incomplete_orders && err.incomplete_orders.length > 0) {
          setIncompleteOrdersList(err.incomplete_orders);
        }
        setShowConfirmModal(false);
        setShowIncompleteWarningModal(true);
        return;
      }
      const msg = err instanceof Error ? err.message : 'Failed to generate final bill';
      setError(msg);
      setShowConfirmModal(false);
    } finally {
      setIsGeneratingFinalBill(false);
    }
  };

  const handlePrint = () => {
    const receiptElement = document.getElementById('printable-receipt');
    if (!receiptElement) {
      window.print();
      return;
    }

    // Remove any previously created print iframe if exists
    const existingFrame = document.getElementById('print-receipt-frame');
    if (existingFrame && existingFrame.parentNode) {
      existingFrame.parentNode.removeChild(existingFrame);
    }

    // Create an invisible iframe for isolated single-page receipt printing
    const iframe = document.createElement('iframe');
    iframe.id = 'print-receipt-frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0.01';
    iframe.style.border = 'none';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Collect all stylesheets and style tags from current page
    let stylesHtml = '';
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      stylesHtml += node.outerHTML;
    });

    const billTitle = bill?.billNumber ? `Bill-${bill.billNumber}` : 'Cafe-Bill';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${billTitle}</title>
          ${stylesHtml}
          <style>
            @page {
              size: auto;
              margin: 8mm 12mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #18312B !important;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
            }
            body * {
              visibility: visible !important;
            }
            .no-print, .no-print * {
              display: none !important;
              visibility: hidden !important;
            }
            #printable-receipt {
              width: 100% !important;
              max-width: 580px !important;
              margin: 0 auto !important;
              padding: 16px !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
            }
          </style>
        </head>
        <body class="bg-white">
          <div id="printable-receipt" class="p-6 space-y-5 bg-white">
            ${receiptElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Give iframe time to parse styles and render before triggering print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1500);
      }
    }, 250);
  };

  const handleSettle = async (method: string) => {
    if (!bill) return;
    setIsSettling(true);
    try {
      const targetSessionId = sessionId || bill.diningSessionId;
      if (targetSessionId) {
        await billingApi.settleSessionPayment(targetSessionId, method);
      } else if (orderId) {
        await billingApi.settlePayment(orderId, method);
      }
      setBill({ ...bill, paymentStatus: 'PAID', sessionStatus: 'CLOSED' });
      onSettled?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to settle payment';
      setError(msg);
    } finally {
      setIsSettling(false);
    }
  };

  if (!orderId && !sessionId) return null;

  const isPaid = bill?.paymentStatus === 'PAID' || bill?.sessionStatus === 'CLOSED';
  const isBillGenerated = !isPaid && (bill?.sessionStatus === 'BILL_GENERATED' || (!bill?.sessionStatus && Boolean(bill?.billNumber?.startsWith('INV-'))));
  const isSessionOpen = !isPaid && !isBillGenerated;
  
  // Options (Discount and Extra Charge) are ONLY visible before bill generation. After generating bill, they are hidden.
  const canEditCharges = isSessionOpen;

  const totalQuantity = bill?.items ? bill.items.reduce((acc, it) => acc + (it.quantity || 0), 0) : 0;

  const breakdown = bill
    ? calculateBillBreakdown(
        bill.subtotal,
        bill.discountPercentage ?? appliedDiscount,
        bill.extraCharge ?? appliedExtraCharge
      )
    : null;

  const subtotal = bill?.subtotal ?? 0;
  const discountPercentage = bill?.discountPercentage ?? breakdown?.discountPercentage ?? 0;
  const discountAmount = bill?.discountAmount ?? breakdown?.discountAmount ?? 0;
  const extraCharge = bill?.extraCharge ?? breakdown?.extraCharge ?? 0;
  const amountAfterAdjustments = bill?.amountAfterAdjustments ?? breakdown?.amountAfterAdjustments ?? (subtotal - discountAmount + extraCharge);
  const roundOff = bill?.roundOff ?? breakdown?.roundOff ?? 0;
  const grandTotal = bill?.total ?? breakdown?.total ?? Math.round(amountAfterAdjustments);

  const hasDiscount = Boolean(discountAmount > 0 || discountPercentage > 0);
  const hasExtraCharge = Boolean(extraCharge > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-brand-green-deep/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col h-full max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header: Fixed at top (Hidden during print) */}
        <div className="px-5 py-3.5 sm:py-4 bg-brand-green text-brand-beige flex items-center justify-between border-b border-brand-green-light shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-beige text-brand-green flex items-center justify-center font-black border border-brand-gold shrink-0">
              व
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight text-brand-beige">Digital Cafe Bill</h3>
              {bill && (
                <p className="text-[10px] text-brand-gold font-mono">
                  Table {bill.tableNumber.toString().padStart(2, '0')} {bill.diningSessionId ? `• Session ${bill.diningSessionId}` : ''}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="w-8 h-8 rounded-full bg-brand-green-light hover:bg-brand-green-surface text-brand-beige flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-5 printable-area bg-[#FCFBF8]" id="printable-receipt">
          {loading && (
            <div className="py-12 text-center text-brand-green/60 text-sm font-medium">
              Loading official tax invoice...
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {bill && !loading && (
            <>
              {/* Session / Table Status Banner (NO-PRINT) */}
              {(isBillGenerated || isPaid) && (
                <div className="no-print space-y-2">
                  {isBillGenerated && !isPaid && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        <span>Final Bill Generated • Table is AVAILABLE</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] uppercase font-mono">
                        Payment Pending
                      </span>
                    </div>
                  )}

                  {isPaid && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Payment Settled & Session Closed</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] uppercase font-mono">
                        PAID
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-brand-beige-dark">
                <div className="text-2xl font-black text-brand-green flex items-center justify-center gap-2">
                  {CAFE_BRAND.hindiName && <span className="font-hindi text-brand-gold">{CAFE_BRAND.hindiName}</span>}
                  <span className="tracking-tight font-serif">{CAFE_BRAND.name || 'CAFE'}</span>
                </div>
                {CAFE_BRAND.tagline && <p className="text-xs text-brand-green/70">{CAFE_BRAND.tagline}</p>}
                {CAFE_BRAND.address && (
                  <p className="text-[11px] text-brand-green/60 font-medium">{CAFE_BRAND.address}</p>
                )}
                {CAFE_BRAND.phone && (
                  <p className="text-[10px] text-brand-green/60 font-mono">Ph: {CAFE_BRAND.phone}</p>
                )}
                {CAFE_BRAND.gstin && (
                  <p className="text-[10px] text-brand-green/60 font-mono">GSTIN: {CAFE_BRAND.gstin}</p>
                )}
              </div>

              {/* Invoice & Order Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-b border-brand-beige-dark/60 text-brand-green">
                <div>
                  <span className="text-brand-green/60 block text-[10px] uppercase font-bold tracking-wider">
                    Bill Number
                  </span>
                  <span className="font-mono font-bold">{bill.billNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-brand-green/60 block text-[10px] uppercase font-bold tracking-wider">
                    Date & Time
                  </span>
                  <span className="font-mono font-medium">{bill.createdAt}</span>
                </div>
                <div>
                  <span className="text-brand-green/60 block text-[10px] uppercase font-bold tracking-wider">
                    Table & Session
                  </span>
                  <span className="font-extrabold">
                    Table {bill.tableNumber.toString().padStart(2, '0')}
                    {bill.diningSessionId ? ` (Session #${bill.diningSessionId.replace('DS-', '')})` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-brand-green/60 block text-[10px] uppercase font-bold tracking-wider">
                    Guest Name
                  </span>
                  <span className="font-medium">{bill.customerName || 'Dining Guests'}</span>
                </div>
                {bill.orderIds && bill.orderIds.length > 1 && (
                  <div className="col-span-2 pt-1 text-[10px] text-brand-green/70 font-mono">
                    Combined Orders: {bill.orderIds.join(', ')}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-beige-dark/80 text-[11px] font-black uppercase text-brand-green/70 tracking-wider">
                        <th className="py-2 pr-1.5 sm:pr-2 text-left font-extrabold">Item</th>
                        <th className="py-2 px-1 sm:px-2 text-center font-extrabold w-11 sm:w-14">Qty</th>
                        <th className="py-2 px-1 sm:px-2 text-right font-extrabold w-18 sm:w-24">Price</th>
                        <th className="py-2 pl-1 sm:pl-2 text-right font-extrabold w-18 sm:w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-beige-dark/30 text-xs text-brand-green">
                      {bill.items.map((item, idx) => (
                        <tr key={idx} className="align-top">
                          <td className="py-2 pr-2">
                            <p className="font-bold leading-snug">{item.name}</p>
                            {item.notes && (
                              <p className="text-[10px] text-brand-green/60 italic mt-0.5">{item.notes}</p>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center text-brand-green/80 font-medium font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-brand-green/80">
                            ₹{item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-2 pl-2 text-right font-bold font-mono text-brand-green">
                            ₹{item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-dashed border-brand-beige-dark/80 text-xs font-bold text-brand-green">
                        <td className="py-2.5 pr-2 font-extrabold">Total Quantity</td>
                        <td className="py-2.5 px-2 text-center font-mono font-extrabold text-brand-green">
                          {totalQuantity}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Admin Bill Controls: Discount & Extra Charge (NO-PRINT) - Only visible BEFORE bill is generated */}
              {canEditCharges && (
                <div className="no-print space-y-3">
                  {/* Apply Discount Box */}
                  <div className="p-3.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark/80 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer text-xs font-black text-brand-green select-none">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={applyDiscountChecked}
                          onChange={(e) => {
                            setApplyDiscountChecked(e.target.checked);
                            setDiscountError(null);
                          }}
                          className="w-4 h-4 rounded text-brand-green focus:ring-brand-gold accent-brand-green cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-brand-gold" />
                          <span>Apply Discount</span>
                        </span>
                      </div>
                      {appliedDiscount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {appliedDiscount}% Applied
                        </span>
                      )}
                    </label>

                    {applyDiscountChecked && (
                      <div className="pt-2 border-t border-brand-beige-dark/60 space-y-2 animate-in fade-in duration-150">
                        <div>
                          <label className="text-[11px] font-bold text-brand-green/70 block mb-1">
                            Discount (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              placeholder="10"
                              value={discountInput}
                              onChange={(e) => {
                                setDiscountInput(e.target.value);
                                setDiscountError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleApplyClick();
                              }}
                              className="w-full pl-3 pr-8 py-1.5 text-xs font-mono font-bold bg-white border border-brand-beige-dark rounded-lg text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-green/60">
                              %
                            </span>
                          </div>
                        </div>

                        {discountError && (
                          <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{discountError}</span>
                          </p>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          {appliedDiscount > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleApplyDiscount(0)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              Remove Discount
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleApplyClick}
                            className="px-4 py-1.5 rounded-lg bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            Apply Discount
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Apply Extra Charge Box */}
                  <div className="p-3.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark/80 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer text-xs font-black text-brand-green select-none">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={applyExtraChargeChecked}
                          onChange={(e) => {
                            setApplyExtraChargeChecked(e.target.checked);
                            setExtraChargeError(null);
                          }}
                          className="w-4 h-4 rounded text-brand-green focus:ring-brand-gold accent-brand-green cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-brand-gold" />
                          <span>Extra Charge</span>
                        </span>
                      </div>
                      {appliedExtraCharge > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                          +₹{appliedExtraCharge.toFixed(2)} Applied
                        </span>
                      )}
                    </label>

                    {applyExtraChargeChecked && (
                      <div className="pt-2 border-t border-brand-beige-dark/60 space-y-2 animate-in fade-in duration-150">
                        <div>
                          <label className="text-[11px] font-bold text-brand-green/70 block mb-1">
                            Extra Charge Amount (₹)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="50"
                              value={extraChargeInput}
                              onChange={(e) => {
                                setExtraChargeInput(e.target.value);
                                setExtraChargeError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleApplyExtraChargeClick();
                              }}
                              className="w-full pl-7 pr-3 py-1.5 text-xs font-mono font-bold bg-white border border-brand-beige-dark rounded-lg text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                            />
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-green/60">
                              ₹
                            </span>
                          </div>
                        </div>

                        {extraChargeError && (
                          <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{extraChargeError}</span>
                          </p>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                          {appliedExtraCharge > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleApplyExtraCharge(0)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                            >
                              Remove Extra Charge
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleApplyExtraChargeClick}
                            className="px-4 py-1.5 rounded-lg bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-2xs transition-all active:scale-95 cursor-pointer"
                          >
                            Apply Extra Charge
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bill Totals */}
              <div className="pt-3 border-t-2 border-brand-green space-y-1.5 text-xs">
                {/* Subtotal */}
                <div className="flex justify-between text-brand-green font-bold pb-1">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                </div>

                {/* Bill-level discount line */}
                {hasDiscount && discountAmount > 0 ? (
                  <div className="flex justify-between text-brand-green font-bold pb-1">
                    <span>Discount ({discountPercentage}%)</span>
                    <span className="font-mono font-bold text-emerald-700">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                ) : null}

                {/* Extra Charge line */}
                {hasExtraCharge && extraCharge > 0 ? (
                  <div className="flex justify-between text-brand-green font-bold pb-1">
                    <span>Extra Charges</span>
                    <span className="font-mono font-bold text-brand-green-deep">+₹{extraCharge.toFixed(2)}</span>
                  </div>
                ) : null}

                {/* Amount After Adjustments */}
                {((hasDiscount && discountAmount > 0) || (hasExtraCharge && extraCharge > 0)) && (
                  <div className="flex justify-between text-brand-green/80 font-bold pb-1 pt-1 border-t border-brand-beige-dark/50">
                    <span>Amount After Adjustments</span>
                    <span className="font-mono">₹{amountAfterAdjustments.toFixed(2)}</span>
                  </div>
                )}

                {/* Round Off line */}
                <div className="flex justify-between text-brand-green font-bold pb-1">
                  <span>Round Off</span>
                  <span className="font-mono font-bold text-brand-green/90">
                    {roundOff > 0
                      ? `+₹${roundOff.toFixed(2)}`
                      : roundOff < 0
                      ? `-₹${Math.abs(roundOff).toFixed(2)}`
                      : `₹0.00`}
                  </span>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between text-base font-black text-brand-green pt-2 border-t-2 border-brand-green">
                  <span>Grand Total</span>
                  <span className="font-mono text-brand-green-deep">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Informational Dining Session Notice ONLY - No buttons inside this notice */}
              {isSessionOpen && (
                <div className="no-print p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Dining Session is OPEN • Table is OCCUPIED</span>
                  </div>
                  <p className="text-[11px] text-amber-800/80 leading-snug">
                    Use the <strong>Generate Final Bill</strong> action in the bottom panel below to conclude this session. The physical table will immediately become <strong>AVAILABLE</strong> for new guests while payment remains pending settlement.
                  </p>
                </div>
              )}

              {/* Footer Stamp */}
              <div className="text-center pt-4 border-t border-dashed border-brand-beige-dark space-y-1">
                <div className={`no-print inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Payment Status: {bill.paymentStatus}</span>
                </div>
                <p className="text-[11px] text-brand-green/60 pt-2 font-medium">
                  Thank you for visiting Vaan Vibes Cafe!
                </p>
                <p className="text-[10px] text-brand-gold font-bold">Taste the Vibe • Come Again</p>
              </div>
            </>
          )}
        </div>

        {/* 3. Sticky bottom action area: Fixed at bottom of modal via flex layout (Hidden during print) */}
        {bill && !loading && (
          <div className="shrink-0 p-3.5 sm:p-4 bg-brand-beige-light border-t border-brand-beige-dark space-y-2.5 no-print">
            {/* Case 1: Session is OPEN -> Dedicated Bill-Generation Container */}
            {isSessionOpen && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-brand-green px-0.5">
                  <span className="font-bold text-brand-green/70">Session Open • Finalize Order</span>
                  <span className="font-mono font-black text-sm text-brand-green-deep">
                    Total Due: ₹{grandTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGeneratingFinalBill}
                    onClick={handleInitiateGenerateBill}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                    <span>{isGeneratingFinalBill ? 'Generating Final Bill...' : 'Generate Final Bill'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green font-bold text-xs transition-all cursor-pointer shrink-0"
                    title="Print Bill"
                  >
                    <Printer className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                    <span className="hidden xs:inline">Print Bill</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2.5 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green/80 hover:text-brand-green font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Case 2: Bill Generated & Payment Pending -> Settle Actions */}
            {isBillGenerated && !isPaid && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-0.5">
                  <span className="font-bold text-purple-900">Final Bill Generated • Payment Pending</span>
                  <span className="font-mono font-black text-sm text-brand-green-deep">
                    Total Due: ₹{grandTotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSettling}
                    onClick={() => handleSettle('UPI')}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSettling ? 'Settling...' : 'Settle via UPI'}
                  </button>
                  <button
                    type="button"
                    disabled={isSettling}
                    onClick={() => handleSettle('CASH')}
                    className="flex-1 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSettling ? 'Settling...' : 'Settle Cash'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green font-bold text-xs transition-all cursor-pointer shrink-0"
                    title="Print Bill"
                  >
                    <Printer className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                    <span className="hidden xs:inline">Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2.5 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Case 3: Payment Settled & Closed */}
            {isPaid && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Payment Settled ({bill.paymentStatus || 'PAID'})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-brand-beige-dark bg-white hover:bg-brand-beige text-brand-green font-bold text-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                    <span>Print Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Generate Bill */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-brand-green-deep/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-brand-beige-dark space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-green shrink-0">
                <FileText className="w-5 h-5 text-brand-gold" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-brand-green leading-snug">Generate Final Bill?</h4>
                <p className="text-[11px] text-brand-green/60">
                  Table {bill?.tableNumber} {bill?.diningSessionId ? `• Session ${bill.diningSessionId}` : ''}
                </p>
              </div>
            </div>

            <p className="text-xs text-brand-green/80 leading-relaxed">
              Are you sure you want to generate the final bill for this order? Once generated, this dining session will be <strong>permanently closed for new orders</strong>.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-brand-beige-dark/60">
              <button
                type="button"
                disabled={isGeneratingFinalBill}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-brand-beige-light hover:bg-brand-beige text-brand-green font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingFinalBill}
                onClick={handleGenerateFinalBill}
                className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isGeneratingFinalBill ? 'Generating...' : 'Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Modal for Incomplete Orders */}
      {showIncompleteWarningModal && (
        <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-brand-green-deep/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-amber-300 space-y-4 animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-base text-amber-950 leading-snug">
                  Orders Still Incomplete
                </h4>
                <p className="text-[11px] font-semibold text-amber-800/80 mt-0.5">
                  Table {bill?.tableNumber || 'Current'} {bill?.diningSessionId ? `• Session ${bill.diningSessionId}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteWarningModal(false)}
                className="text-amber-800/60 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100/50 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-900 leading-relaxed font-medium">
              <p>
                Some orders for <strong>Table {bill?.tableNumber || ''}</strong> have not been marked as completed/served yet. Please verify that all items have been served to the customer before generating the final bill.
              </p>
            </div>

            {/* List of Incomplete Orders */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-amber-900/80 uppercase tracking-wider flex items-center justify-between">
                <span>Incomplete Orders ({incompleteOrdersList.length})</span>
                <span className="text-[10px] text-amber-700 font-semibold">Must be Served / Completed</span>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-amber-100/70">
                {incompleteOrdersList.map((order) => {
                  const rawStatus = (order.status || 'PLACED').toUpperCase();
                  const orderId = order.order_number || order.orderNumber || order.order_id || order.orderId || 'Order';
                  
                  let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
                  let statusLabel = 'Placed';
                  if (rawStatus === 'ACCEPTED') {
                    badgeStyle = 'bg-blue-100 text-blue-800 border-blue-300';
                    statusLabel = 'Accepted';
                  } else if (rawStatus === 'IN_KITCHEN') {
                    badgeStyle = 'bg-orange-100 text-orange-800 border-orange-300';
                    statusLabel = 'In Kitchen';
                  } else if (rawStatus === 'PLACED') {
                    badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
                    statusLabel = 'Placed';
                  } else {
                    statusLabel = rawStatus;
                  }

                  return (
                    <div
                      key={order.order_id || order.orderId || orderId}
                      className="pt-2 first:pt-0 p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-brand-green">
                            #{orderId}
                          </span>
                          <span className="text-[10px] text-brand-green/60 font-medium">
                            Table {order.table_number || order.tableNumber || bill?.tableNumber}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badgeStyle}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {order.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-green bg-white px-2 py-0.5 rounded-lg border border-brand-beige-dark shadow-2xs"
                            >
                              <strong className="text-amber-800 font-extrabold">{item.quantity}x</strong>
                              <span>{item.name}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-brand-beige-dark/60">
              <button
                type="button"
                onClick={() => setShowIncompleteWarningModal(false)}
                className="px-4 py-2.5 rounded-xl bg-brand-beige-light hover:bg-brand-beige text-brand-green font-bold text-xs transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleReviewOrders}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Review Orders</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
