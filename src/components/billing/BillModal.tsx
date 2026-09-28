'use client';

import React, { useEffect, useState } from 'react';
import { BillData } from '@/types/cafe';
import { X, Printer, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

interface Props {
  orderId: string | null;
  onClose: () => void;
}

export function BillModal({ orderId, onClose }: Props) {
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/billing/${orderId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to generate bill');
        return res.json();
      })
      .then((data) => {
        if (data.bill) setBill(data.bill);
      })
      .catch((err) => {
        setError(err.message || 'Error generating invoice');
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (!orderId) return null;

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
            <h3 className="font-extrabold text-lg">Digital Cafe Bill</h3>
          </div>
          <div className="flex items-center gap-2">
            {bill && (
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-beige text-brand-green font-bold text-xs hover:bg-brand-beige-dark transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-brand-green-light hover:bg-brand-green-surface flex items-center justify-center text-brand-beige transition-all"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
              <p className="text-xs text-brand-green/60">Generating invoice details...</p>
            </div>
          ) : error || !bill ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <p className="text-sm font-bold text-red-600">{error || 'Could not find bill'}</p>
            </div>
          ) : (
            /* Printable Receipt Layout */
            <div id="printable-receipt" className="space-y-5 font-mono text-xs text-brand-green bg-white p-2">
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-4 border-b border-dashed border-brand-green/30">
                <div className="font-sans font-black text-2xl tracking-tight text-brand-green">
                  {bill.cafe.hindiName}
                </div>
                <div className="font-sans font-bold text-base text-brand-green">
                  {bill.cafe.name}
                </div>
                <p className="text-[11px] text-brand-green/70">{bill.cafe.tagline}</p>
                <p className="text-[10px] text-brand-green/60">{bill.cafe.address}</p>
                <p className="text-[10px] text-brand-green/60">Phone: {bill.cafe.phone}</p>
                <p className="text-[10px] text-brand-green/60">GSTIN: {bill.cafe.gstin}</p>
              </div>

              {/* Order Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-brand-green/30">
                <div>
                  <span className="text-brand-green/60">Invoice No:</span>{' '}
                  <span className="font-bold">{bill.billNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-brand-green/60">Table:</span>{' '}
                  <span className="font-bold text-sm bg-brand-beige px-1.5 py-0.5 rounded">
                    Table {bill.tableNumber.toString().padStart(2, '0')}
                  </span>
                </div>
                <div>
                  <span className="text-brand-green/60">Date:</span>{' '}
                  <span>{new Date(bill.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-brand-green/60">Time:</span>{' '}
                  <span>{new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <span className="text-brand-green/60">Guest:</span>{' '}
                  <span className="font-bold">{bill.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-brand-green/60">Mobile:</span>{' '}
                  <span>+91 {bill.customerMobile}</span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 text-[11px] font-bold pb-1 border-b border-brand-green/20">
                  <span className="col-span-6">Item</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-2 text-right">Price</span>
                  <span className="col-span-2 text-right">Total</span>
                </div>

                <div className="space-y-2 text-[11px] py-1">
                  {bill.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 items-start">
                      <div className="col-span-6 pr-1">
                        <div className="font-bold">{it.name}</div>
                        {it.notes && (
                          <div className="text-[10px] text-brand-green/60">{it.notes}</div>
                        )}
                      </div>
                      <div className="col-span-2 text-center">{it.quantity}</div>
                      <div className="col-span-2 text-right">₹{it.unitPrice}</div>
                      <div className="col-span-2 text-right font-bold">₹{it.totalPrice}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Tax Calculation */}
              <div className="pt-3 border-t border-dashed border-brand-green/30 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{bill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-brand-green/70">
                  <span>CGST (2.5%)</span>
                  <span>₹{bill.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-brand-green/70">
                  <span>SGST (2.5%)</span>
                  <span>₹{bill.sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-2 border-t border-brand-green/30">
                  <span>NET PAYABLE</span>
                  <span className="font-bold text-base">₹{bill.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Status Pill */}
              <div className="pt-3 border-t border-dashed border-brand-green/30 flex items-center justify-between">
                <span className="text-xs text-brand-green/60">Payment Status:</span>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    bill.paymentStatus === 'PAID'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {bill.paymentStatus === 'PAID' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> PAID
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" /> PENDING
                    </>
                  )}
                </span>
              </div>

              {/* Receipt Footer Message */}
              <div className="text-center pt-4 text-[10px] text-brand-green/60 space-y-1">
                <p>Thank you for dining at Vaan Vibes Cafe & Restro!</p>
                <p>Follow us on Instagram: @vanvibes</p>
                <p>*** Please visit again ***</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 bg-brand-beige-light border-t border-brand-beige-dark flex items-center justify-between no-print">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-brand-green text-brand-green hover:bg-brand-beige font-bold text-xs transition-colors"
          >
            Close
          </button>
          {bill && (
            <button
              type="button"
              onClick={handlePrint}
              className="py-2.5 px-5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Physical Bill</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
