import { Order, OrderItem } from "@/types/cafe";
import { MENU_ITEMS } from "@/data/vaan-vibes-menu";

/**
 * Authoritative KOT (Kitchen Order Ticket) Category Identifiers.
 * Items belonging to these categories are routed to the Admin KOT (Barista/Beverage/Dessert) station.
 * All other categories are routed to the Kitchen (Chef) line.
 */
export const KOT_CATEGORY_SLUGS = [
  "hot-coffee",
  "iced-coffee",
  "non-coffee",
  "manual-brew",
  "shake",
  "frappe",
  "dessert",
] as const;

export const KOT_CATEGORY_NAMES = [
  "Hot Coffee",
  "Iced Coffee",
  "Non Coffee",
  "Manual Brew",
  "Shake",
  "Frappe",
  "ShakeFrappe",
  "Dessert",
] as const;

/**
 * Normalizes a category string for case- and separator-insensitive comparison.
 */
function normalizeCategory(cat: string): string {
  return cat.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const NORMALIZED_KOT_CATEGORIES = new Set([
  "hotcoffee",
  "icedcoffee",
  "noncoffee",
  "manualbrew",
  "shake",
  "frappe",
  "shakefrappe",
  "dessert",
]);

/**
 * Keywords for fallback identification if an item lacks category metadata.
 */
const BEVERAGE_DESSERT_KEYWORDS = [
  "coffee", "espresso", "latte", "cappuccino", "americano", "mocha", "brew",
  "cold brew", "iced tea", "frappe", "shake", "cooler", "mojito", "smoothie",
  "dessert", "brownie", "cheesecake", "waffle", "cake", "pastry", "sundae",
  "tiramisu", "ice cream", "churros", "mousse", "hot chocolate", "tea", "chai"
];

/**
 * Checks whether an order item belongs to the KOT station (Beverages & Desserts).
 */
export function isKotItem(item: OrderItem): boolean {
  if (!item) return false;

  // 1. Direct item.category property check
  if (item.category && typeof item.category === "string") {
    const norm = normalizeCategory(item.category);
    if (NORMALIZED_KOT_CATEGORIES.has(norm)) {
      return true;
    }
  }

  // 2. Catalog lookup from static MENU_ITEMS
  const itemName = (item.name || item.item_name || "").trim().toLowerCase();
  const catalogMatch = MENU_ITEMS.find((m) => {
    if (item.menuItemId && m.id === item.menuItemId) return true;
    if (item.id && m.id === item.id) return true;
    return m.name.toLowerCase() === itemName;
  });

  if (catalogMatch && catalogMatch.category) {
    const normCat = normalizeCategory(catalogMatch.category);
    if (NORMALIZED_KOT_CATEGORIES.has(normCat)) {
      return true;
    }
    // If found in catalog with non-KOT category, it is definitely a kitchen item
    return false;
  }

  // 3. Fallback keyword matching for customized or ad-hoc items
  for (const kw of BEVERAGE_DESSERT_KEYWORDS) {
    if (itemName.includes(kw)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether an order item belongs to the Chef (Kitchen) station.
 */
export function isChefItem(item: OrderItem): boolean {
  return !isKotItem(item);
}

/**
 * Filters an order to only include items assigned to the KOT station.
 */
export function getOrderKotItems(order: Order): OrderItem[] {
  if (!order || !Array.isArray(order.items)) return [];
  return order.items.filter(isKotItem);
}

/**
 * Filters an order to only include items assigned to the Chef station.
 */
export function getOrderChefItems(order: Order): OrderItem[] {
  if (!order || !Array.isArray(order.items)) return [];
  return order.items.filter(isChefItem);
}

// ==========================================
// KOT / CHEF COMPLETION SYNCHRONIZATION
// ==========================================

export const KOT_DONE_STORAGE_KEY = "vv_kot_done_orders";
export const KOT_PREP_PREFIX = "kot_prep_items_";

const inMemoryKotDone: Record<string, boolean> = {};

/**
 * Retrieves the map of orders marked Done at the KOT station.
 */
export function getKotDoneOrders(): Record<string, boolean> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(KOT_DONE_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("Failed to parse KOT done orders:", err);
    }
  }
  return { ...inMemoryKotDone };
}

/**
 * Checks whether an order is marked Done at the KOT station.
 */
export function isKotOrderDone(orderId: string): boolean {
  if (!orderId) return false;
  const doneMap = getKotDoneOrders();
  return Boolean(doneMap[orderId]);
}

/**
 * Marks or unmarks an order as Done at the KOT station.
 */
export function setKotOrderDone(orderId: string, isDone: boolean): void {
  if (!orderId) return;
  if (isDone) {
    inMemoryKotDone[orderId] = true;
  } else {
    delete inMemoryKotDone[orderId];
  }
  if (typeof window !== "undefined") {
    try {
      const map = getKotDoneOrders();
      if (isDone) {
        map[orderId] = true;
      } else {
        delete map[orderId];
      }
      localStorage.setItem(KOT_DONE_STORAGE_KEY, JSON.stringify(map));
      window.dispatchEvent(
        new CustomEvent("kot_status_change", {
          detail: { orderId, isDone },
        })
      );
    } catch (err) {
      console.error("Failed to update KOT done status:", err);
    }
  }
}

/**
 * Checks whether the Chef has completed kitchen preparation for an order.
 * An order is considered Chef-Done if:
 * 1. It contains no kitchen items at all.
 * 2. Its backend status is IN_KITCHEN, SERVED, or COMPLETED.
 */
export function isChefOrderDone(order: Order): boolean {
  if (!order) return true;
  const chefItems = getOrderChefItems(order);
  if (chefItems.length === 0) {
    return true; // No chef items required
  }
  const st = (order.status || "").toUpperCase();
  return st === "IN_KITCHEN" || st === "SERVED" || st === "COMPLETED";
}

export interface OrderCompletionCheckResult {
  canComplete: boolean;
  isChefPending: boolean;
  isKotPending: boolean;
  pendingChefItems: OrderItem[];
  pendingKotItems: OrderItem[];
  totalChefItems: number;
  totalKotItems: number;
}

/**
 * Evaluates whether an order can be marked as COMPLETED by the Admin:
 * An order can only be completed if BOTH:
 * 1. Chef preparation is done (if the order has kitchen items).
 * 2. KOT preparation is done (if the order has KOT beverage/dessert items).
 */
export function canCompleteOrder(order: Order): OrderCompletionCheckResult {
  if (!order) {
    return {
      canComplete: true,
      isChefPending: false,
      isKotPending: false,
      pendingChefItems: [],
      pendingKotItems: [],
      totalChefItems: 0,
      totalKotItems: 0,
    };
  }

  const chefItems = getOrderChefItems(order);
  const kotItems = getOrderKotItems(order);

  const chefDone = chefItems.length === 0 || isChefOrderDone(order);
  const kotDone = kotItems.length === 0 || isKotOrderDone(order.id);

  const isChefPending = !chefDone;
  const isKotPending = !kotDone;

  return {
    canComplete: chefDone && kotDone,
    isChefPending,
    isKotPending,
    pendingChefItems: isChefPending ? chefItems : [],
    pendingKotItems: isKotPending ? kotItems : [],
    totalChefItems: chefItems.length,
    totalKotItems: kotItems.length,
  };
}
