'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { wsManager, WebSocketEventType } from '@/services/websocket/WebSocketManager';
import {
  exportApi,
  ExportCategory,
  ExportDateRange,
  ExportFilters,
  ExportPreviewResponse,
} from '@/api/export';
import {
  Download,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileArchive,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  Layers,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  QrCode,
  Users,
  Eye,
} from 'lucide-react';

interface CategoryOption {
  id: ExportCategory;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: 'orders',
    name: 'Orders',
    description: 'Header-level order totals, customer details, table number & live status.',
    icon: ShoppingBag,
  },
  {
    id: 'order_items',
    name: 'Order Items',
    description: 'Itemized lines, quantities, unit prices, selected options & add-ons.',
    icon: Layers,
  },
  {
    id: 'bills',
    name: 'Bills & Invoices',
    description: 'Consolidated invoices, GST tax breakdowns, discounts & payment records.',
    icon: Receipt,
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Payment settlement logs, tender modes (CASH/CARD/UPI) & amounts.',
    icon: CreditCard,
  },
  {
    id: 'menu_items',
    name: 'Menu Catalog',
    description: 'Full menu catalog, prices, categories, vegetarian tags & availability.',
    icon: UtensilsCrossed,
  },
  {
    id: 'tables',
    name: 'Tables & Floor',
    description: 'Dine-in table inventory, capacities, statuses & QR codes.',
    icon: QrCode,
  },
  {
    id: 'staff',
    name: 'Staff & Chefs',
    description: 'Authorized team directory, assigned roles, contact numbers & shifts.',
    icon: Users,
  },
];

const DATE_RANGES: { id: ExportDateRange; label: string }[] = [
  { id: 'last_1_day', label: 'Last 1 Day' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'custom', label: 'Custom Range' },
  { id: 'all_time', label: 'All Time' },
];

export default function ExportDataPage() {
  const [selectedCategories, setSelectedCategories] = useState<ExportCategory[]>([
    'orders',
    'bills',
  ]);
  const [dateRange, setDateRange] = useState<ExportDateRange>('last_7_days');

  // Custom date inputs
  const todayStr = new Date().toISOString().split('T')[0];
  const lastWeekStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(lastWeekStr);
  const [endDate, setEndDate] = useState(todayStr);

  // Category-specific filters
  const [orderStatus, setOrderStatus] = useState('ALL');
  const [tableNumber, setTableNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');
  const [menuAvailability, setMenuAvailability] = useState('ALL');
  const [tableStatus, setTableStatus] = useState('ALL');
  const [staffRole, setStaffRole] = useState('ALL');

  // Preview & Action states
  const [preview, setPreview] = useState<ExportPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle Category selection
  const toggleCategory = (catId: ExportCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const selectAll = () => {
    setSelectedCategories(CATEGORIES.map((c) => c.id));
  };

  const deselectAll = () => {
    setSelectedCategories([]);
  };

  // Compile active filters object
  const buildFilters = useCallback((): ExportFilters => {
    const f: ExportFilters = {};
    if (orderStatus !== 'ALL') f.orderStatus = orderStatus;
    if (tableNumber.trim()) f.tableNumber = parseInt(tableNumber.trim(), 10) || undefined;
    if (paymentStatus !== 'ALL') f.billPaymentStatus = paymentStatus;
    if (paymentMethod !== 'ALL') f.billPaymentMethod = paymentMethod;
    if (menuAvailability !== 'ALL') f.menuAvailability = menuAvailability === 'AVAILABLE';
    if (tableStatus !== 'ALL') f.tableStatus = tableStatus;
    if (staffRole !== 'ALL') f.staffRole = staffRole;
    return f;
  }, [orderStatus, tableNumber, paymentStatus, paymentMethod, menuAvailability, tableStatus, staffRole]);

  // Fetch record count preview (supports silent real-time updates)
  const fetchPreview = useCallback(async (silent = false) => {
    if (selectedCategories.length === 0) {
      setPreview(null);
      return;
    }

    if (dateRange === 'custom' && startDate > endDate) {
      setErrorMessage('Start date cannot be after end date.');
      return;
    }

    if (!silent) {
      setIsPreviewLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await exportApi.preview({
        categories: selectedCategories,
        dateRange,
        startDate: dateRange === 'custom' ? startDate : undefined,
        endDate: dateRange === 'custom' ? endDate : undefined,
        filters: buildFilters(),
      });
      setPreview(res);
    } catch (err: unknown) {
      if (!silent) {
        const msg = err instanceof Error ? err.message : 'Failed to fetch preview counts.';
        setErrorMessage(msg);
        setPreview(null);
      }
    } finally {
      if (!silent) {
        setIsPreviewLoading(false);
      }
    }
  }, [selectedCategories, dateRange, startDate, endDate, buildFilters]);

  // Refetch preview when criteria changes (with slight debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPreview]);

  // Real-time synchronization via WebSocket & periodic auto-sync
  useEffect(() => {
    const events: WebSocketEventType[] = [
      'ORDER_PLACED',
      'ORDER_CREATED',
      'ORDER_ACCEPTED',
      'ORDER_SERVED',
      'ORDER_COMPLETED',
      'ORDER_STATUS_UPDATED',
      'PAYMENT_SETTLED',
      'TABLE_STATUS_UPDATED',
      'MENU_AVAILABILITY_CHANGED',
      'MENU_ITEM_UPDATED',
      'MENU_ITEM_DELETED',
    ];

    const unsubs = events.map((evt) =>
      wsManager.on(evt, () => {
        fetchPreview(true);
      })
    );

    const interval = setInterval(() => {
      fetchPreview(true);
    }, 15000);

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
      clearInterval(interval);
    };
  }, [fetchPreview]);

  // Handle Download
  const handleDownload = async () => {
    if (selectedCategories.length === 0) {
      setErrorMessage('Please select at least one data category to export.');
      return;
    }

    if (dateRange === 'custom' && startDate > endDate) {
      setErrorMessage('Start date cannot be after end date.');
      return;
    }

    if (preview && preview.total_records === 0) {
      setErrorMessage('No records match the selected export criteria. Adjust your filters before downloading.');
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await exportApi.download({
        categories: selectedCategories,
        dateRange,
        startDate: dateRange === 'custom' ? startDate : undefined,
        endDate: dateRange === 'custom' ? endDate : undefined,
        filters: buildFilters(),
      });
      setSuccessMessage(`Successfully downloaded ${res.filename}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export generation failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsDownloading(false);
    }
  };

  const hasOrderCategory =
    selectedCategories.includes('orders') || selectedCategories.includes('order_items');
  const hasBillCategory =
    selectedCategories.includes('bills') || selectedCategories.includes('payments');
  const hasMenuCategory = selectedCategories.includes('menu_items');
  const hasTableCategory = selectedCategories.includes('tables');
  const hasStaffCategory = selectedCategories.includes('staff');
  const hasAnyFilter =
    hasOrderCategory || hasBillCategory || hasMenuCategory || hasTableCategory || hasStaffCategory;

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* Top Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-brand-beige-dark/60 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-brand-green tracking-tight font-serif">
                Export Data
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-gold text-brand-green font-mono">
                Admin Reports
              </span>
            </div>
            <p className="text-xs text-brand-green/70 mt-1">
              Select specific business datasets, date ranges, and custom filters to generate verified CSV exports.
            </p>
          </div>

        </div>

        {/* Notifications / Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Controls: Categories & Dates (2 Cols on Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Data Categories */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-beige-dark shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-brand-beige-dark/50">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-green text-brand-beige text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-extrabold text-sm sm:text-base text-brand-green">
                    Select Data Categories
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-brand-green/70 hover:text-brand-green font-bold flex items-center gap-1 transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Select All</span>
                  </button>
                  <span className="text-brand-beige-dark">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-brand-green/70 hover:text-brand-green font-bold flex items-center gap-1 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id);
                  const Icon = cat.icon;
                  const count = preview?.counts?.[cat.id];

                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isSelected
                          ? 'bg-brand-beige-light border-brand-green ring-1 ring-brand-green shadow-xs'
                          : 'bg-white border-brand-beige-dark hover:border-brand-green/40'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-brand-green text-brand-gold'
                            : 'bg-brand-beige text-brand-green/60'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-extrabold text-xs text-brand-green">{cat.name}</p>
                          {isSelected && count !== undefined && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green">
                              {count} rows
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-brand-green/60 mt-0.5 leading-snug line-clamp-2">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Date Range Selection */}
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-beige-dark shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-brand-beige-dark/50">
                <span className="w-6 h-6 rounded-full bg-brand-green text-brand-beige text-xs font-black flex items-center justify-center">
                  2
                </span>
                <h2 className="font-extrabold text-sm sm:text-base text-brand-green">
                  Date Range
                </h2>
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-2">
                {DATE_RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDateRange(r.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      dateRange === r.id
                        ? 'bg-brand-green text-brand-beige shadow-xs'
                        : 'bg-brand-beige-light border border-brand-beige-dark text-brand-green hover:bg-brand-beige'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {dateRange === 'custom' && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-green block">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || todayStr}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-green block">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={todayStr}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-brand-beige-dark text-xs text-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Specific Record Filters (Dynamic based on selected categories) */}
            {hasAnyFilter && (
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-beige-dark shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-brand-beige-dark/50">
                  <span className="w-6 h-6 rounded-full bg-brand-green text-brand-beige text-xs font-black flex items-center justify-center">
                    3
                  </span>
                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-brand-green">
                      Category-Specific Filters
                    </h2>
                    <p className="text-[11px] text-brand-green/60">
                      Refine rows for selected categories (optional)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Orders Filter */}
                  {hasOrderCategory && (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-brand-green block">Order Status</label>
                        <select
                          value={orderStatus}
                          onChange={(e) => setOrderStatus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        >
                          <option value="ALL">All Order Statuses</option>
                          <option value="PLACED">Placed</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="IN_KITCHEN">In Kitchen</option>
                          <option value="SERVED">Served</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-brand-green block">Table Number</label>
                        <input
                          type="number"
                          placeholder="e.g. 1, 2, 7"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green placeholder:text-brand-green/30 focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        />
                      </div>
                    </>
                  )}

                  {/* Bills / Payments Filters */}
                  {hasBillCategory && (
                    <>
                      <div className="space-y-1">
                        <label className="font-bold text-brand-green block">Payment Status</label>
                        <select
                          value={paymentStatus}
                          onChange={(e) => setPaymentStatus(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        >
                          <option value="ALL">All Payment Statuses</option>
                          <option value="PAID">Paid Only</option>
                          <option value="PENDING">Pending Only</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-brand-green block">Payment Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        >
                          <option value="ALL">All Payment Methods</option>
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="CARD">Card</option>
                        </select>
                      </div>
                    </>
                  )}

                  {/* Menu Items Filter */}
                  {hasMenuCategory && (
                    <div className="space-y-1">
                      <label className="font-bold text-brand-green block">Menu Availability</label>
                      <select
                        value={menuAvailability}
                        onChange={(e) => setMenuAvailability(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                      >
                        <option value="ALL">All Items</option>
                        <option value="AVAILABLE">Available Only</option>
                        <option value="UNAVAILABLE">Unavailable Only</option>
                      </select>
                    </div>
                  )}

                  {/* Tables Filter */}
                  {hasTableCategory && (
                    <div className="space-y-1">
                      <label className="font-bold text-brand-green block">Table Status</label>
                      <select
                        value={tableStatus}
                        onChange={(e) => setTableStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                      >
                        <option value="ALL">All Table Statuses</option>
                        <option value="AVAILABLE">Available Only</option>
                        <option value="OCCUPIED">Occupied Only</option>
                      </select>
                    </div>
                  )}

                  {/* Staff Filter */}
                  {hasStaffCategory && (
                    <div className="space-y-1">
                      <label className="font-bold text-brand-green block">Staff Role</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-brand-beige-dark text-xs text-brand-green bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                      >
                        <option value="ALL">All Staff Roles</option>
                        <option value="ADMIN">Admin Staff</option>
                        <option value="CHEF">Kitchen Chefs</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Preview & Download Card */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-brand-green text-brand-beige border border-brand-gold/30 shadow-xl space-y-5 sticky top-6">
              <div className="flex items-center gap-2 border-b border-brand-green-light pb-3">
                <FileSpreadsheet className="w-5 h-5 text-brand-gold" />
                <h3 className="font-black text-base tracking-tight">Export Summary</h3>
              </div>

              {/* Format Badge */}
              <div className="p-3.5 rounded-2xl bg-brand-green-surface border border-brand-gold/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-beige-muted font-medium">Output Format:</span>
                  <div className="flex items-center gap-1 font-bold text-brand-gold">
                    {selectedCategories.length === 1 ? (
                      <>
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>CSV Document</span>
                      </>
                    ) : (
                      <>
                        <FileArchive className="w-4 h-4" />
                        <span>ZIP Archive (Multiple CSVs)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-beige-muted font-medium">Encoding:</span>
                  <span className="font-mono text-xs font-bold text-brand-beige">UTF-8 with BOM</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-beige-muted font-medium">Security:</span>
                  <span className="text-[11px] font-bold text-emerald-300">Formula Escaping Enabled</span>
                </div>
              </div>

              {/* Selected Categories Preview */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-brand-gold tracking-wider">
                  Selected Categories ({selectedCategories.length})
                </span>

                {selectedCategories.length === 0 ? (
                  <p className="text-brand-beige-muted italic text-xs">No categories selected.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedCategories.map((c) => {
                      const opt = CATEGORIES.find((item) => item.id === c);
                      const cnt = preview?.counts?.[c];
                      return (
                        <div
                          key={c}
                          className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-brand-green-light/50 text-xs"
                        >
                          <span className="font-medium text-brand-beige">{opt?.name || c}</span>
                          <span className="font-mono text-[11px] font-bold text-brand-gold">
                            {cnt !== undefined ? `${cnt} rows` : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Estimated Records */}
              <div className="pt-2 border-t border-brand-green-light flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-beige-muted tracking-wider block">
                    Total Records
                  </span>
                  <p className="text-2xl font-black text-brand-gold font-mono">
                    {isPreviewLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin inline-block text-brand-gold" />
                    ) : (
                      preview?.total_records ?? '—'
                    )}
                  </p>
                </div>
                <div className="text-right text-[11px] text-brand-beige-muted font-medium">
                  {preview?.date_range_label || dateRange}
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleDownload}
                disabled={
                  isDownloading ||
                  selectedCategories.length === 0 ||
                  (preview !== null && preview.total_records === 0)
                }
                className="w-full py-3.5 px-4 rounded-2xl bg-brand-gold hover:bg-yellow-400 text-brand-green font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand-green" />
                    <span>Generating Export...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-brand-green" />
                    <span>Download Report</span>
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-brand-beige-muted">
                Admin credential verification required. Sensitive authentication keys and passwords are systematically excluded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
