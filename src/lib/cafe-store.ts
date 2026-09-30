import { BillData, CafeDetails, CartItem, Order, OrderStatus, PaymentStatus, TableInfo } from '@/types/cafe';
import { MENU_ITEMS } from '@/data/vaan-vibes-menu';
import { ordersApi } from '@/api/orders';
import { tablesApi } from '@/api/tables';
import { billingApi } from '@/api/billing';
import { wsManager } from '@/services/websocket/WebSocketManager';

export const CAFE_INFO: CafeDetails = {
  id: 'van-vibes',
  name: 'Vaan Vibes Cafe & Restro',
  hindiName: 'वन VIBES',
  tagline: 'Cafe & Restro • Taste the Vibe',
  address: 'Main Promenade, Serenita Arts Quarter, Surat, Gujarat - 395007',
  phone: '+91 98765 43210',
  gstin: '24AAAAA0000A1Z5',
  currency: '₹',
  taxRate: 0.05, // 5% GST
};

// Initial tables with pre-generated secure tokens
const INITIAL_TABLES: TableInfo[] = Array.from({ length: 12 }, (_, i) => {
  const num = i + 1;
  const pad = num.toString().padStart(2, '0');
  const id = `T${pad}`;
  const token = `vv_sec_${id.toLowerCase()}_${(num * 7393 + 19283).toString(16)}`;
  return {
    id,
    tableNumber: num,
    name: `Table ${pad}`,
    token,
    qrCodeUrl: `/cafe/van-vibes/menu?table=${id}&token=${token}`,
    capacity: num <= 4 ? 2 : num <= 8 ? 4 : 6,
    status: num === 3 || num === 7 ? 'OCCUPIED' : 'AVAILABLE',
  };
});

interface GlobalStore {
  orders: Order[];
  tables: TableInfo[];
  isInitialized: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __VAAN_VIBES_STORE__: GlobalStore | undefined;
}

if (!global.__VAAN_VIBES_STORE__) {
  global.__VAAN_VIBES_STORE__ = {
    orders: [],
    tables: INITIAL_TABLES,
    isInitialized: false,
  };
}

const store = global.__VAAN_VIBES_STORE__!;

// Synchronize store with backend in background
export async function syncStoreWithBackend() {
  try {
    const [fetchedOrders, fetchedTables] = await Promise.all([
      ordersApi.getOrders().catch(() => []),
      tablesApi.getTables().catch(() => []),
    ]);

    if (fetchedOrders && fetchedOrders.length > 0) {
      store.orders = fetchedOrders;
    }
    if (fetchedTables && fetchedTables.length > 0) {
      store.tables = fetchedTables;
    }
    store.isInitialized = true;
  } catch {
    // ignore
  }
}

// Subscribe to real-time events on client
if (typeof window !== 'undefined') {
  syncStoreWithBackend();

  wsManager.on('ORDER_CREATED', (order: Order) => {
    const exists = store.orders.some((o) => o.id === order.id);
    if (!exists) {
      store.orders.unshift(order);
    }
  });

  wsManager.on('ORDER_STATUS_UPDATED', (data: { orderId: string; status: OrderStatus }) => {
    const found = store.orders.find((o) => o.id === data.orderId);
    if (found) {
      found.status = data.status;
      found.updatedAt = new Date().toISOString();
    }
  });

  wsManager.on('TABLE_STATUS_UPDATED', (data: { tableId: string; status: any }) => {
    const found = store.tables.find((t) => t.id === data.tableId);
    if (found) {
      found.status = data.status;
    }
  });
}

export const CafeStore = {
  getCafeDetails(): CafeDetails {
    return CAFE_INFO;
  },

  getAllTables(): TableInfo[] {
    return store.tables;
  },

  getTable(tableId: string): TableInfo | undefined {
    return store.tables.find(
      (t) => t.id.toLowerCase() === tableId.toLowerCase() || t.tableNumber.toString() === tableId
    );
  },

  getAllOrders(): Order[] {
    return [...store.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  getOrderById(id: string): Order | undefined {
    return store.orders.find((o) => o.id === id);
  },

  getOrdersByTable(tableId: string): Order[] {
    const table = this.getTable(tableId);
    if (!table) return [];
    return store.orders
      .filter((o) => o.tableId === table.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      const updated = await ordersApi.updateStatus(orderId, status);
      const found = store.orders.find((o) => o.id === orderId);
      if (found) {
        found.status = updated.status;
        found.updatedAt = updated.updatedAt;
      }
      return { success: true, order: updated };
    } catch (err: any) {
      // Local fallback if offline
      const order = store.orders.find((o) => o.id === orderId);
      if (order) {
        order.status = status;
        order.updatedAt = new Date().toISOString();
        return { success: true, order };
      }
      return { success: false, error: err?.message || 'Failed to update order status' };
    }
  },

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, method = 'CASH'): Promise<{ success: boolean; order?: Order; error?: string }> {
    try {
      if (paymentStatus === 'PAID') {
        await billingApi.settlePayment(orderId, method);
      }
      const order = store.orders.find((o) => o.id === orderId);
      if (order) {
        order.paymentStatus = paymentStatus;
        order.updatedAt = new Date().toISOString();
      }
      return { success: true, order };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update payment status' };
    }
  },

  generateBill(orderId: string): BillData | null {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    const cgst = Math.round((order.tax / 2) * 100) / 100;
    const sgst = Math.round((order.tax / 2) * 100) / 100;

    return {
      billNumber: `BILL-${order.id.replace('VV-', '')}-${new Date(order.createdAt).getFullYear()}`,
      orderId: order.id,
      cafe: CAFE_INFO,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      customerMobile: order.customerMobile,
      specialInstructions: order.specialInstructions,
      items: order.items.map((i) => {
        const uPrice = i.unitPrice ?? i.price ?? 0;
        const lTotal = i.itemTotal ?? i.lineTotal ?? (uPrice * i.quantity);
        return {
          name: i.name,
          quantity: i.quantity,
          unitPrice: uPrice,
          totalPrice: lTotal,
          notes: i.specialInstructions,
        };
      }),
      subtotal: order.subtotal,
      cgst,
      sgst,
      taxAmount: order.tax,
      total: order.total,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    };
  },
};
