'use client';

import React, { useEffect } from "react";
import { Order, OrderItem } from "@/types/cafe";
import { getOrderKotItems } from "@/utils/kot";
import { Printer, X, Coffee, Clock } from "lucide-react";

interface Props {
  order: Order | null;
  orders?: Order[];
  isOpen: boolean;
  onClose: () => void;
}

export function KotPrintModal({ order, orders, isOpen, onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const ticketsToPrint: Order[] = orders && orders.length > 0 ? orders : order ? [order] : [];

  if (ticketsToPrint.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleString();
    const d = new Date(isoString);
    return isNaN(d.getTime()) ? new Date().toLocaleString() : d.toLocaleString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 my-auto text-brand-green"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Header (Hidden when printing) */}
        <div className="p-4 sm:p-5 border-b border-brand-beige-dark/70 bg-brand-beige-light flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/20 flex items-center justify-center text-brand-green shrink-0">
              <Coffee className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-brand-green leading-tight">
                KOT Print Preview
              </h3>
              <p className="text-xs text-brand-green/60 font-medium">
                {ticketsToPrint.length === 1
                  ? `Order #${ticketsToPrint[0].id} • Table ${ticketsToPrint[0].tableNumber || ticketsToPrint[0].tableId || 1}`
                  : `Batch Print (${ticketsToPrint.length} tickets)`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-brand-beige text-brand-green/70 flex items-center justify-center transition-colors cursor-pointer border border-brand-beige-dark/50"
            title="Close Preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-brand-beige-light/30">
          <div id="printable-kot" className="space-y-6 max-w-[400px] mx-auto">
            {ticketsToPrint.map((ticket, tIdx) => {
              const kotItems = getOrderKotItems(ticket);
              const totalKotUnits = kotItems.reduce(
                (sum, item) => sum + (item.quantity || 1),
                0
              );

              return (
                <div
                  key={ticket.id || tIdx}
                  className="bg-white p-5 rounded-2xl border border-brand-beige-dark shadow-xs space-y-4 text-brand-green kot-slip-page"
                  style={{ fontFamily: "monospace, monospace" }}
                >
                  {/* Slip Header */}
                  <div className="text-center space-y-1 pb-3 border-b border-dashed border-brand-beige-dark">
                    <p className="text-sm font-black tracking-widest uppercase">
                      वन VIBES RESTRO &amp; CAFÉ
                    </p>
                    <p className="text-xs font-bold tracking-wider text-brand-green/80 uppercase">
                      KITCHEN ORDER TICKET (KOT)
                    </p>
                    <div className="inline-block px-2.5 py-0.5 rounded bg-brand-beige-light border border-brand-beige-dark text-[11px] font-black tracking-wide text-brand-green mt-1">
                      BARISTA • BEVERAGE &amp; DESSERT
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-1 border-b border-dashed border-brand-beige-dark">
                    <div>
                      <span className="text-[10px] uppercase text-brand-green/60 block font-sans font-bold">
                        Table
                      </span>
                      <span className="text-base font-black text-brand-green-deep">
                        TABLE {ticket.tableNumber || ticket.tableId || "1"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-brand-green/60 block font-sans font-bold">
                        Ticket ID
                      </span>
                      <span className="font-bold text-xs">
                        #{ticket.id}
                      </span>
                    </div>

                    <div className="col-span-2 flex items-center justify-between text-[11px] text-brand-green/70 pt-1">
                      <span>Time: {formatDateTime(ticket.createdAt)}</span>
                      <span>Customer: {ticket.customerName || "Guest"}</span>
                    </div>
                  </div>

                  {/* KOT Items List */}
                  <div className="space-y-2 py-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-brand-green/60 pb-1 border-b border-brand-beige-dark/50 font-sans">
                      <span>Qty × Item</span>
                      <span>Station</span>
                    </div>

                    {kotItems.length === 0 ? (
                      <p className="text-xs text-center py-2 text-brand-green/50 italic">
                        No beverage/dessert items in this ticket.
                      </p>
                    ) : (
                      kotItems.map((item: OrderItem, idx: number) => (
                        <div
                          key={item.id ? `${item.id}-${idx}` : `kot-${idx}`}
                          className="py-1.5 border-b border-dashed border-brand-beige-dark/40 last:border-b-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-black text-sm">
                              {item.quantity || 1}× {item.name || item.item_name || "Item"}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-brand-green/60 font-sans">
                              KOT
                            </span>
                          </div>

                          {/* Options / Add-ons */}
                          {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                            <p className="text-[10px] text-brand-green/70 pl-5">
                              {Object.entries(item.selectedOptions)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" • ")}
                            </p>
                          )}
                          {item.selectedAddOns && item.selectedAddOns.length > 0 && (
                            <p className="text-[10px] text-amber-800 font-semibold pl-5">
                              Add-ons: {item.selectedAddOns.join(", ")}
                            </p>
                          )}
                          {item.specialInstructions && (
                            <p className="text-[10px] text-amber-900 font-bold italic pl-5 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 border border-amber-200">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Customer General Instructions */}
                  {ticket.specialInstructions && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
                      <p className="font-bold text-[10px] uppercase text-amber-800 font-sans">
                        Special Instructions:
                      </p>
                      <p className="text-xs italic mt-0.5 font-medium">
                        {ticket.specialInstructions}
                      </p>
                    </div>
                  )}

                  {/* Footer Count & Cut Line */}
                  <div className="text-center pt-2 border-t border-dashed border-brand-beige-dark space-y-1 text-xs">
                    <p className="font-bold">
                      Total Items to Prepare: {totalKotUnits} units
                    </p>
                    <p className="text-[10px] text-brand-green/60">
                      Printed at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[11px] font-mono tracking-widest text-brand-green/40 pt-1">
                      ✄ - - - - - - - - - - - - - - - - - -
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Bottom Actions (Hidden when printing) */}
        <div className="p-4 sm:p-5 border-t border-brand-beige-dark/70 bg-white flex items-center justify-end gap-3 shrink-0 no-print">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-brand-beige-dark hover:bg-brand-beige-light text-brand-green font-bold text-xs transition-all cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige font-black text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-brand-gold" />
            <span>Print KOT Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
