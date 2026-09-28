'use client';

import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TableInfo } from '@/types/cafe';
import { CafeStore } from '@/lib/cafe-store';
import { QrCode, ExternalLink, Printer, Check, Copy } from 'lucide-react';

export default function TablesManagementPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setTables(CafeStore.getAllTables());
  }, []);

  const handleCopyLink = (table: TableInfo) => {
    const url = `${window.location.origin}/?table=${table.id}&token=${table.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(table.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight">
              Table QR Standee Management
            </h1>
            <p className="text-xs text-brand-green/70 mt-0.5">
              12 authenticated dining tables with encrypted tokens and instant digital ordering.
            </p>
          </div>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className="bg-white rounded-2xl border border-brand-beige-dark p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark/50">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-brand-green text-brand-beige font-black text-xs flex items-center justify-center font-mono">
                      {table.tableNumber.toString().padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-brand-green">
                        Table {table.tableNumber.toString().padStart(2, '0')}
                      </h3>
                      <p className="text-[10px] text-brand-green/60 font-mono">{table.id}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Active
                  </span>
                </div>

                {/* QR Code Preview Visual */}
                <div className="my-4 p-4 rounded-xl bg-brand-beige-light flex flex-col items-center justify-center border border-dashed border-brand-beige-dark">
                  <div className="w-24 h-24 bg-white p-2 rounded-lg shadow-2xs border border-brand-beige-dark flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-brand-green" />
                  </div>
                  <span className="text-[10px] text-brand-green/60 mt-2 font-mono">
                    Token: {table.token.substring(0, 14)}...
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-brand-beige-dark/40 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyLink(table)}
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-beige-light hover:bg-brand-beige text-brand-green font-bold text-xs border border-brand-beige-dark flex items-center justify-center gap-1.5 transition-all"
                >
                  {copiedId === table.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-brand-green/60" />
                      <span>Copy QR Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTable(table)}
                  className="p-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige transition-colors"
                  title="View Standee"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Standee Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl border border-brand-beige-dark animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-xl mx-auto border border-brand-gold">
              व
            </div>

            <div>
              <h3 className="text-xl font-black text-brand-green">
                Table {selectedTable.tableNumber.toString().padStart(2, '0')} Standee
              </h3>
              <p className="text-xs text-brand-green/60 mt-0.5">
                Scan with phone camera to view menu & order
              </p>
            </div>

            <div className="p-6 bg-brand-beige-light rounded-2xl border-2 border-dashed border-brand-green/30 flex flex-col items-center">
              <QrCode className="w-36 h-36 text-brand-green" />
              <p className="text-xs font-black text-brand-green mt-3 tracking-wider uppercase font-mono">
                {selectedTable.id} • VAAN VIBES
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-brand-green text-brand-beige font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-brand-gold" />
                <span>Print Standee</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="py-2.5 px-4 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
