'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { tablesApi } from '@/api/tables';
import { TableInfo } from '@/types/cafe';
import { wsManager } from '@/services/websocket/WebSocketManager';
import {
  ExternalLink,
  Printer,
  Copy,
  Check,
  X,
  AlertCircle,
  MoreVertical,
  Trash2,
} from 'lucide-react';

export default function TablesPage() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Add Table Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [isSavingTable, setIsSavingTable] = useState(false);
  const [addTableError, setAddTableError] = useState<string | null>(null);

  // 3-dots menu & Delete Modal state
  const [openMenuTableId, setOpenMenuTableId] = useState<string | null>(null);
  const [tableToDelete, setTableToDelete] = useState<TableInfo | null>(null);
  const [isDeletingTable, setIsDeletingTable] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Close 3-dots menu on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-table-menu]')) {
        return;
      }
      setOpenMenuTableId(null);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpenMenuTableId(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;
    try {
      setIsDeletingTable(true);
      setDeleteError(null);
      await tablesApi.deleteTable(tableToDelete.id);
      setTables((prev) => prev.filter((t) => t.id !== tableToDelete.id));
      setTableToDelete(null);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete table. Please try again.');
    } finally {
      setIsDeletingTable(false);
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      const data = await tablesApi.getTables();
      setTables(data);
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  }, []);

  useEffect(() => {
    fetchTables();

    const handleStatusUpdate = (data: { tableId?: string; table_id?: string; status: string }) => {
      const id = data.tableId || data.table_id;
      if (!id) return;
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: data.status as any } : t))
      );
    };

    const handleSessionUpdate = () => {
      fetchTables();
    };

    const unsubStatus = wsManager.on('TABLE_STATUS_UPDATED', handleStatusUpdate);
    const unsubSession = wsManager.on('DINING_SESSION_OPENED', handleSessionUpdate);
    const unsubClosed = wsManager.on('DINING_SESSION_CLOSED', handleSessionUpdate);
    const unsubTableCreated = wsManager.on('TABLE_CREATED', handleSessionUpdate);
    const unsubTableDeleted = wsManager.on('TABLE_DELETED', handleSessionUpdate);

    return () => {
      unsubStatus();
      unsubSession();
      unsubClosed();
      unsubTableCreated();
      unsubTableDeleted();
    };
  }, [fetchTables]);

  const handleCopyLink = async (table: TableInfo) => {
    const url = table.qrCodeUrl || `http://localhost:3000/cafe/van-vibes/menu?table=${table.id}&token=${table.token}`;
    try {
      if (typeof window !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedId(table.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTableError(null);

    const num = parseInt(newTableNumber.trim(), 10);
    if (isNaN(num) || num <= 0) {
      setAddTableError('Please enter a valid table number greater than 0.');
      return;
    }

    if (tables.some((t) => t.tableNumber === num)) {
      setAddTableError(`Table ${num} already exists. Please choose a different number.`);
      return;
    }

    setIsSavingTable(true);
    try {
      const newTable = await tablesApi.createTable(num);
      setTables((prev) => [...prev, newTable].sort((a, b) => a.tableNumber - b.tableNumber));
      setIsAddModalOpen(false);
      setNewTableNumber('');
    } catch (err: any) {
      console.error('Failed to create table:', err);
      setAddTableError(err?.message || 'Failed to create table. Please check input.');
    } finally {
      setIsSavingTable(false);
    }
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
              Authenticated dining tables with backend-generated cryptographic QR tokens.
            </p>
          </div>

          {/* Add Table Action Button (Replaces Refresh) */}
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(true);
              setAddTableError(null);
              setNewTableNumber('');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <span>+ Add Table</span>
          </button>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`bg-white rounded-2xl border border-brand-beige-dark p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                openMenuTableId === table.id ? 'relative z-30' : 'relative z-0'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark/50">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-brand-green text-brand-beige font-black text-xs flex items-center justify-center font-mono shrink-0">
                      {table.tableNumber.toString().padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-brand-green leading-tight">
                        Table {table.tableNumber.toString().padStart(2, '0')}
                      </h3>
                      <span
                        className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border inline-block mt-0.5 ${
                          table.status === 'OCCUPIED'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {table.status}
                      </span>
                    </div>
                  </div>

                  {/* 3-dots Menu Button */}
                  <div
                    className={`relative ${openMenuTableId === table.id ? 'z-40' : 'z-10'}`}
                    data-table-menu
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuTableId((prev) => (prev === table.id ? null : table.id));
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        openMenuTableId === table.id
                          ? 'bg-brand-beige text-brand-green ring-1 ring-brand-beige-dark'
                          : 'hover:bg-brand-beige text-brand-green/60 hover:text-brand-green'
                      }`}
                      aria-label={`Options for Table ${table.tableNumber}`}
                    >
                      <MoreVertical className="w-4 h-4 pointer-events-none" />
                    </button>

                    {openMenuTableId === table.id && (
                      <div
                        className="absolute right-0 top-9 w-40 bg-white rounded-xl shadow-xl border border-brand-beige-dark p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuTableId(null);
                            setTableToDelete(table);
                            setDeleteError(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer group"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform" />
                          <span>Delete Table</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Preview Visual generated by FastAPI backend */}
                <div className="my-4 p-4 rounded-xl bg-brand-beige-light flex flex-col items-center justify-center border border-dashed border-brand-beige-dark">
                  <div className="w-28 h-28 bg-white p-2 rounded-xl shadow-2xs border border-brand-beige-dark flex items-center justify-center overflow-hidden">
                    {/* Backend-generated QR PNG stream */}
                    <img
                      src={tablesApi.getQrCodeUrl(table.id)}
                      alt={`Table ${table.tableNumber} QR`}
                      className="w-full h-full object-contain"
                    />
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
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-beige-light hover:bg-brand-beige text-brand-green font-bold text-xs border border-brand-beige-dark flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
                  className="p-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige transition-colors cursor-pointer"
                  title="View Standee"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Table Custom Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl border border-brand-beige-dark animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-beige text-brand-green font-black flex items-center justify-center text-sm border border-brand-gold">
                  +
                </div>
                <h3 className="text-base font-black text-brand-green">Add Table</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-brand-green/60 hover:text-brand-green p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addTableError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addTableError}</span>
              </div>
            )}

            <form onSubmit={handleAddTable} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-green block">
                  Table Number
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 13"
                  value={newTableNumber}
                  onChange={(e) => {
                    setNewTableNumber(e.target.value);
                    setAddTableError(null);
                  }}
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-white border border-brand-beige-dark rounded-xl text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingTable}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTable || !newTableNumber.trim()}
                  className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-black shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSavingTable ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Table</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Standee Modal with Backend QR Image */}
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
              <img
                src={tablesApi.getQrCodeUrl(selectedTable.id)}
                alt={`Table ${selectedTable.tableNumber} Official QR`}
                className="w-40 h-40 object-contain rounded-xl bg-white p-2 shadow-xs border border-brand-beige-dark"
              />
              <p className="text-xs font-black text-brand-green mt-3 tracking-wider uppercase font-mono">
                {selectedTable.id} • VAAN VIBES
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-brand-green text-brand-beige font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-brand-gold" />
                <span>Print Standee</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="py-2.5 px-4 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Confirmation Modal */}
      {tableToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full space-y-4 shadow-2xl border border-brand-beige-dark animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-brand-beige-dark/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-sm border border-red-200">
                  <Trash2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-brand-green">Delete Table</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isDeletingTable) setTableToDelete(null);
                }}
                className="text-brand-green/60 hover:text-brand-green p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-brand-green/70">
              Are you sure you want to delete <span className="font-bold text-brand-green">Table {tableToDelete.tableNumber.toString().padStart(2, '0')}</span>? This will remove the table and deactivate its QR standee.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingTable}
                onClick={() => setTableToDelete(null)}
                className="px-4 py-2 rounded-xl bg-brand-beige hover:bg-brand-beige-dark text-brand-green text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingTable}
                onClick={handleDeleteTable}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingTable ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Table</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </AppLayout>
  );
}
