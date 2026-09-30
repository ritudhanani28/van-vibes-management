'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BillData } from '@/types/cafe';
import { billingApi } from '@/api/billing';
import {
  FileText,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  Tag,
  Sparkles,
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

  // Bill-level Discount State
  const [applyDiscountChecked, setApplyDiscountChecked] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [isGeneratingFinalBill, setIsGeneratingFinalBill] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const fetchBill = useCallback(async () => {
    if (!sessionId && !orderId) return;
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
      setBill(data);
      if (data.discountPercentage && data.discountPercentage > 0) {
        setApplyDiscountChecked(true);
        setDiscountInput(data.discountPercentage.toString());
      } else if (data.discountAmount && data.discountAmount > 0 && data.subtotal > 0) {
        setApplyDiscountChecked(true);
        const pct = Math.round((data.discountAmount / data.subtotal) * 100);
        setDiscountInput(pct.toString());
      } else {
        setApplyDiscountChecked(false);
        setDiscountInput('');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading invoice receipt');
    } finally {
      setLoading(false);
    }
  }, [sessionId, orderId]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  const handleApplyDiscount = async (percentage: number) => {
    if ((!orderId && !sessionId) || !bill) return;

    if (percentage < 0 || percentage > 100) {
      setDiscountError('Discount percentage must be between 0 and 100%.');
      return;
    }

    setIsApplyingDiscount(true);
    setDiscountError(null);

    try {
      let updatedBill: BillData;
      const targetSessionId = sessionId || bill.diningSessionId;
      if (targetSessionId) {
        updatedBill = await billingApi.generateSessionBill(targetSessionId, percentage);
      } else {
        updatedBill = await billingApi.generateBill(orderId!, percentage);
      }
      setBill(updatedBill);
      if (percentage > 0) {
        setDiscountInput(percentage.toString());
        setApplyDiscountChecked(true);
      } else {
        setDiscountInput('');
        setApplyDiscountChecked(false);
      }
      onSettled?.();
    } catch (err: any) {
      setDiscountError(err.message || 'Failed to apply discount.');
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const handleApplyClick = () => {
    const parsed = parseFloat(discountInput.trim());
    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      setDiscountError('Discount percentage must be between 0 and 100%.');
      return;
    }
    handleApplyDiscount(parsed);
  };

  const handleGenerateFinalBill = async () => {
    if (!bill) return;
    setIsGeneratingFinalBill(true);
    setError(null);
    try {
      const parsedDiscount = applyDiscountChecked ? parseFloat(discountInput.trim()) || 0 : 0;
      let updatedBill: BillData;
      const targetSessionId = sessionId || bill.diningSessionId;
      if (targetSessionId) {
        updatedBill = await billingApi.generateSessionBill(targetSessionId, parsedDiscount);
      } else if (orderId) {
        updatedBill = await billingApi.generateBill(orderId, parsedDiscount);
      } else {
        return;
      }
      setBill(updatedBill);
      onSettled?.();
    } catch (err: any) {
      setError(err.message || 'Failed to generate final bill');
    } finally {
      setIsGeneratingFinalBill(false);
    }
  };

  const handlePrint = () => {
    window.print();
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
    } catch (err: any) {
      setError(err.message || 'Failed to settle payment');
    } finally {
      setIsSettling(false);
    }
  };

  if (!orderId && !sessionId) return null;

  const isSessionOpen = bill?.sessionStatus === 'OPEN';
  const isBillGenerated = bill?.sessionStatus === 'BILL_GENERATED';
  const isPaid = bill?.paymentStatus === 'PAID';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-green-deep/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Hidden during print) */}
        <div className="px-5 py-4 bg-brand-green text-brand-beige flex items-center justify-between border-b border-brand-green-light no-print">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-gold" />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">Digital Cafe Bill</h3>
              {bill && (
                <p className="text-[10px] text-brand-gold font-mono">
                  Table {bill.tableNumber} {bill.diningSessionId ? `• Session ${bill.diningSessionId}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {bill && (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-beige text-brand-green font-bold text-xs hover:bg-brand-beige-dark transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-brand-gold" />
                <span>Print Bill</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-brand-beige/80 hover:text-brand-beige transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 printable-area bg-[#FCFBF8]" id="printable-receipt">
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
              <div className="no-print space-y-2">
                {isSessionOpen && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Dining Session is OPEN • Table is OCCUPIED</span>
                        </div>
                        <p className="text-[11px] text-amber-800/80 mt-0.5 leading-snug">
                          Click below to generate the final bill. The physical table will immediately become <strong>AVAILABLE</strong> for new guests while payment remains pending.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingFinalBill}
                      onClick={handleGenerateFinalBill}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                      <span>{isGeneratingFinalBill ? 'Generating Final Bill...' : 'Generate Final Bill & Free Table'}</span>
                    </button>
                  </div>
                )}

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

              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-brand-beige-dark">
                <div className="text-2xl font-black text-brand-green flex items-center justify-center gap-2">
                  <span className="font-hindi text-brand-gold">वन VIBES</span>
                  <span className="tracking-tight font-serif">CAFE</span>
                </div>
                <p className="text-xs text-brand-green/70">A Quiet Corner for Real Conversations</p>
                <p className="text-[11px] text-brand-green/60 font-mono">GSTIN: 24AAAFV1234A1Z5</p>
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
                    {bill.diningSessionId ? ` (${bill.diningSessionId})` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-brand-green/60 block text-[10px] uppercase font-bold tracking-wider">
                    Customer
                  </span>
                  <span className="font-semibold truncate max-w-[150px] inline-block">
                    {bill.customerName} {bill.customerMobile && bill.customerMobile !== '--' ? `(${bill.customerMobile})` : ''}
                  </span>
                </div>
                {bill.orderIds && bill.orderIds.length > 1 && (
                  <div className="col-span-2 pt-1 text-[10px] text-brand-green/70 font-mono">
                    Combined Orders: {bill.orderIds.join(', ')}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <div className="flex justify-between text-[11px] font-black uppercase text-brand-green/60 tracking-wider pb-1 border-b border-brand-beige-dark/50">
                  <span>Item</span>
                  <div className="flex gap-4">
                    <span className="w-8 text-center">Qty</span>
                    <span className="w-16 text-right">Price</span>
                  </div>
                </div>

                <div className="divide-y divide-brand-beige-dark/30">
                  {bill.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex justify-between items-start text-xs text-brand-green">
                      <div className="flex-1 pr-2">
                        <p className="font-bold">{item.name}</p>
                        {item.notes && (
                          <p className="text-[10px] text-brand-green/60 italic">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <span className="w-8 text-center text-brand-green/70">{item.quantity}</span>
                        <span className="w-16 text-right font-bold font-mono">₹{item.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Bill Discount Section (NO-PRINT: only controls are hidden during printing) */}
              {!isPaid && (
                <div className="no-print p-3.5 rounded-xl bg-brand-beige-light border border-brand-beige-dark/80 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-brand-green select-none">
                    <input
                      type="checkbox"
                      checked={applyDiscountChecked}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setApplyDiscountChecked(isChecked);
                        setDiscountError(null);
                        if (!isChecked && bill.discountAmount && bill.discountAmount > 0) {
                          handleApplyDiscount(0);
                        }
                      }}
                      className="w-4 h-4 rounded text-brand-green focus:ring-brand-gold accent-brand-green cursor-pointer"
                    />
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-brand-gold" />
                      <span>Apply Discount</span>
                    </span>
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
                        <button
                          type="button"
                          disabled={isApplyingDiscount}
                          onClick={handleApplyClick}
                          className="px-4 py-1.5 rounded-lg bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {isApplyingDiscount ? 'Applying...' : 'Apply Discount'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Totals & GST calculation */}
              <div className="pt-3 border-t-2 border-brand-green space-y-1.5 text-xs">
                <div className="flex justify-between text-brand-green/70">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold">₹{bill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-green/70">
                  <span>CGST (2.5%)</span>
                  <span className="font-mono font-bold">₹{bill.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-brand-green/70">
                  <span>SGST (2.5%)</span>
                  <span className="font-mono font-bold">₹{bill.sgst.toFixed(2)}</span>
                </div>

                {/* Bill-level discount line appears dynamically only when discount applied */}
                {bill.discountAmount && bill.discountAmount > 0 ? (
                  <div className="flex justify-between text-brand-green font-bold">
                    <span>Discount ({bill.discountPercentage || Math.round((bill.discountAmount / (bill.subtotal || 1)) * 100)}%)</span>
                    <span className="font-mono font-bold">-₹{bill.discountAmount.toFixed(2)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between text-base font-black text-brand-green pt-2 border-t border-brand-beige-dark">
                  <span>Total Due</span>
                  <span className="font-mono text-brand-green-deep">₹{bill.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Settle Action in Modal if Pending */}
              {!isPaid && (
                <div className="no-print pt-3 flex items-center gap-2">
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
                    {isSettling ? 'Settling...' : 'Settle with Cash'}
                  </button>
                </div>
              )}

              {/* Footer Stamp */}
              <div className="text-center pt-4 border-t border-dashed border-brand-beige-dark space-y-1">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
      </div>
    </div>
  );
}
