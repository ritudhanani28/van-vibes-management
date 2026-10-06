'use client';

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { KotCard } from "@/features/orders/components/KotCard";
import { KotPrintModal } from "@/features/orders/components/KotPrintModal";
import { ordersApi } from "@/api/orders";
import { Order } from "@/types/cafe";
import { wsManager } from "@/services/websocket/WebSocketManager";
import {
  getOrderKotItems,
  isKotOrderDone,
  getKotDoneOrders,
} from "@/utils/kot";
import {
  AlertSound,
  getSavedAlertSound,
  getSavedKdsInterval,
  playAlertSound,
  ALERT_SOUND_STORAGE_KEY,
} from "@/lib/sound";
import {
  Coffee,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  RotateCcw,
  Bell,
  BellOff,
  Sparkles,
  Calendar,
  ChevronDown,
  Check,
  Printer,
  Search,
} from "lucide-react";

type DateFilterOption = {
  label: string;
  value: "today" | "yesterday" | "this_month" | "this_year";
};

const DATE_FILTER_OPTIONS: DateFilterOption[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Month", value: "this_month" },
  { label: "This Year", value: "this_year" },
];

export default function KotManagementPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "completed">("live");
  const [chimeEnabled, setChimeEnabled] = useState(true);
  const [alertSound, setAlertSound] = useState<AlertSound>(() => getSavedAlertSound());
  const [kdsIntervalSec, setKdsIntervalSec] = useState<number>(() => getSavedKdsInterval());
  const [searchQuery, setSearchQuery] = useState("");

  // KOT Done tracking trigger state for re-rendering
  const [doneVersion, setDoneVersion] = useState(0);

  // KOT Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSingleOrder, setPrintSingleOrder] = useState<Order | null>(null);
  const [printBatchOrders, setPrintBatchOrders] = useState<Order[]>([]);

  // Date Filter State
  const [selectedFilter, setSelectedFilter] = useState<"today" | "yesterday" | "this_month" | "this_year">("today");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Listen to KOT status change events
  useEffect(() => {
    const handleKotChange = () => {
      setDoneVersion((v) => v + 1);
    };
    window.addEventListener("kot_status_change", handleKotChange);
    window.addEventListener("storage", handleKotChange);
    return () => {
      window.removeEventListener("kot_status_change", handleKotChange);
      window.removeEventListener("storage", handleKotChange);
    };
  }, []);

  // Real-time synchronization with Cafe Settings (Sound & Refresh Interval)
  useEffect(() => {
    const handleSoundChange = (e: Event) => {
      const customEvent = e as CustomEvent<AlertSound>;
      if (customEvent.detail) {
        setAlertSound(customEvent.detail);
      } else {
        setAlertSound(getSavedAlertSound());
      }
    };

    const handleIntervalChange = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      if (customEvent.detail) {
        setKdsIntervalSec(customEvent.detail);
      } else {
        setKdsIntervalSec(getSavedKdsInterval());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === ALERT_SOUND_STORAGE_KEY) {
        setAlertSound(getSavedAlertSound());
      }
    };

    window.addEventListener("kds_alert_sound_change", handleSoundChange);
    window.addEventListener("kds_interval_change", handleIntervalChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("kds_alert_sound_change", handleSoundChange);
      window.removeEventListener("kds_interval_change", handleIntervalChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Chime player on new incoming orders
  const playKotChime = useCallback(() => {
    if (!chimeEnabled) return;
    playAlertSound(alertSound);
  }, [chimeEnabled, alertSound]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoadError(null);
      const filtered = await ordersApi.getOrders({ range: selectedFilter });
      setOrders(filtered);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to load KOT orders. Please try again.";
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    ordersApi.getOrders({ range: selectedFilter }).then((filtered) => {
      if (active) {
        setOrders(filtered);
        setLoadError(null);
      }
    }).catch((err) => {
      if (active) {
        const msg = err instanceof Error ? err.message : "Unable to load KOT orders. Please try again.";
        setLoadError(msg);
      }
    }).finally(() => {
      if (active) setIsLoading(false);
    });

    // Real-time: order accepted by admin or placed
    const handleOrderAccepted = () => {
      loadOrders();
      playKotChime();
    };

    const unsubAccepted = wsManager.on("ORDER_ACCEPTED", handleOrderAccepted);
    const unsubPlaced = wsManager.on("ORDER_PLACED", handleOrderAccepted);
    const unsubUpdated = wsManager.on("ORDER_STATUS_UPDATED", () => loadOrders());
    const unsubInKitchen = wsManager.on("ORDER_IN_KITCHEN", () => loadOrders());
    const unsubCompleted = wsManager.on("ORDER_COMPLETED", () => loadOrders());
    const unsubTransferred = wsManager.on("TABLE_TRANSFERRED", () => loadOrders());

    const interval = setInterval(loadOrders, kdsIntervalSec * 1000);
    return () => {
      active = false;
      clearInterval(interval);
      unsubAccepted();
      unsubPlaced();
      unsubUpdated();
      unsubInKitchen();
      unsubCompleted();
      unsubTransferred();
    };
  }, [loadOrders, playKotChime, selectedFilter, kdsIntervalSec]);

  // Filter orders that contain KOT items
  const allKotOrders = orders.filter((o) => getOrderKotItems(o).length > 0);

  // Live tickets: Accepted or In Kitchen, and not yet marked Done in KOT, not Cancelled or Completed
  const liveKotOrders = allKotOrders.filter((o) => {
    const isCancelledOrComp = o.status === "CANCELLED" || o.status === "COMPLETED";
    if (isCancelledOrComp) return false;
    const done = isKotOrderDone(o.id);
    return !done;
  });

  // Completed tickets: marked Done in KOT, or Completed
  const completedKotOrders = allKotOrders.filter((o) => {
    if (o.status === "CANCELLED") return false;
    const done = isKotOrderDone(o.id);
    return done || o.status === "COMPLETED";
  });

  // Search filter
  const applySearch = (list: Order[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((o) => {
      const tableMatch = `table ${o.tableNumber || o.tableId}`.toLowerCase().includes(q);
      const idMatch = o.id.toLowerCase().includes(q);
      const custMatch = (o.customerName || "").toLowerCase().includes(q);
      const itemMatch = o.items.some((it) => (it.name || "").toLowerCase().includes(q));
      return tableMatch || idMatch || custMatch || itemMatch;
    });
  };

  const displayedLiveOrders = applySearch(liveKotOrders);
  const displayedCompletedOrders = applySearch(completedKotOrders);

  // Printing handlers
  const handlePrintSingle = (orderToPrint: Order) => {
    setPrintSingleOrder(orderToPrint);
    setPrintBatchOrders([]);
    setPrintModalOpen(true);
  };

  const handlePrintAllLive = () => {
    if (liveKotOrders.length === 0) return;
    setPrintSingleOrder(null);
    setPrintBatchOrders(liveKotOrders);
    setPrintModalOpen(true);
  };

  const handleKotDoneAction = (orderId: string) => {
    setDoneVersion((v) => v + 1);
  };

  const currentFilterLabel = DATE_FILTER_OPTIONS.find((o) => o.value === selectedFilter)?.label || "Today";

  return (
    <AppLayout requiredRole="ADMIN">
      <div className="space-y-6">
        {/* KOT Top Header Strip */}
        <div className="p-4 sm:p-5 rounded-2xl bg-brand-green text-brand-beige shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-gold text-brand-green font-black flex items-center justify-center text-lg shadow-sm">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-brand-beige">
                  Kitchen Order Tickets (KOT)
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-brand-gold text-brand-green">
                  Beverage &amp; Dessert Line
                </span>
              </div>
              <p className="text-xs text-brand-beige-muted mt-0.5">
                Barista station display: Coffees, Shakes, Frappes, Manual Brews &amp; Desserts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch Print All Live KOTs */}
            <button
              type="button"
              disabled={liveKotOrders.length === 0}
              onClick={handlePrintAllLive}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-green-light hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all border border-brand-gold/40 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              title="Print all incoming KOT tickets"
            >
              <Printer className="w-3.5 h-3.5 text-brand-gold" />
              <span>Print All KOTs ({liveKotOrders.length})</span>
            </button>

            {/* Custom Date Filter Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-brand-green-light hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all border border-brand-gold/30 cursor-pointer shadow-2xs"
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
              >
                <Calendar className="w-3.5 h-3.5 text-brand-gold" />
                <span>{currentFilterLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-brand-beige-dark py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {DATE_FILTER_OPTIONS.map((option) => {
                    const isSelected = selectedFilter === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedFilter(option.value);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-brand-green text-brand-beige"
                            : "text-brand-green hover:bg-brand-beige-light"
                        }`}
                      >
                        <span>{option.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-gold" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setChimeEnabled(!chimeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                chimeEnabled && alertSound !== "silent"
                  ? "bg-brand-gold text-brand-green"
                  : "bg-brand-green-light text-brand-beige"
              }`}
              title={
                !chimeEnabled
                  ? "Sound muted"
                  : alertSound === "silent"
                  ? "Silent mode set in settings"
                  : `Alert sound: ${alertSound === "bell" ? "Kitchen Bell" : "Dining Chime"}`
              }
            >
              {chimeEnabled && alertSound !== "silent" ? (
                <Bell className="w-3.5 h-3.5" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
              <span>
                {!chimeEnabled
                  ? "Muted"
                  : alertSound === "silent"
                  ? "Silent"
                  : alertSound === "bell"
                  ? "Bell ON"
                  : "Chime ON"}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Tabs Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "live"
                  ? "bg-brand-green text-brand-beige shadow-xs"
                  : "bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark"
              }`}
            >
              Live KOT Tickets ({liveKotOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("completed")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "completed"
                  ? "bg-brand-green text-brand-beige shadow-xs"
                  : "bg-white text-brand-green/70 hover:bg-brand-beige border border-brand-beige-dark"
              }`}
            >
              Completed Tickets ({completedKotOrders.length})
            </button>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-green/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table, order, item..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-brand-beige-dark bg-white text-xs text-brand-green placeholder:text-brand-green/40 focus:outline-hidden focus:border-brand-green"
            />
          </div>
        </div>

        {/* Main Orders Display */}
        {isLoading ? (
          <div className="py-16 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-3 px-4">
            <Loader2 className="w-8 h-8 text-brand-green animate-spin mx-auto" />
            <p className="text-xs font-bold text-brand-green">Loading KOT tickets...</p>
          </div>
        ) : loadError ? (
          <div className="py-16 bg-white rounded-3xl border border-red-200 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-red-700 text-base">Unable to load KOT orders</h3>
            <p className="text-xs text-red-600/80 max-w-md mx-auto">{loadError}</p>
            <button
              type="button"
              onClick={loadOrders}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-beige text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-gold" />
              <span>Retry</span>
            </button>
          </div>
        ) : activeTab === "live" ? (
          /* Live Incoming KOT Tickets */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-brand-green">
                  Pending Beverage &amp; Dessert Preparation
                </h2>
              </div>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono">
                {displayedLiveOrders.length}
              </span>
            </div>

            {displayedLiveOrders.length === 0 ? (
              <div className="p-12 rounded-3xl bg-white border border-brand-beige-dark text-center space-y-2">
                <Sparkles className="w-10 h-10 text-amber-500/40 mx-auto" />
                <p className="text-sm font-bold text-brand-green/70">No pending KOT tickets</p>
                <p className="text-xs text-brand-green/50">
                  Beverage and dessert orders accepted by Admin will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedLiveOrders.map((order) => (
                  <KotCard
                    key={order.id}
                    order={order}
                    onPrint={handlePrintSingle}
                    onKotDone={handleKotDoneAction}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Completed KOT Tickets */
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="font-extrabold text-sm uppercase tracking-wider text-brand-green">
                  Completed KOT Tickets ({displayedCompletedOrders.length})
                </h2>
              </div>
            </div>

            {displayedCompletedOrders.length === 0 ? (
              <div className="p-12 bg-white rounded-3xl border border-brand-beige-dark text-center space-y-2">
                <Clock className="w-8 h-8 text-brand-green/30 mx-auto" />
                <p className="text-xs font-bold text-brand-green/60">No completed KOT tickets found for selected period</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedCompletedOrders.map((order) => (
                  <KotCard
                    key={order.id}
                    order={order}
                    isCompletedTab={true}
                    onPrint={handlePrintSingle}
                    onReopenKot={handleKotDoneAction}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Printable KOT Modal */}
        <KotPrintModal
          isOpen={printModalOpen}
          order={printSingleOrder}
          orders={printBatchOrders}
          onClose={() => setPrintModalOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
