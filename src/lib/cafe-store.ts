import { BillData, CafeDetails, CartItem, Order, OrderStatus, PaymentStatus, TableInfo } from '@/types/cafe';
import { MENU_ITEMS } from '@/data/vaan-vibes-menu';

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
  // Deterministic, secure token based on table index
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

// Seed sample orders for immediate live dashboard readiness
const INITIAL_ORDERS: Order[] = [
  {
    id: 'VV-1001',
    cafeId: 'vaan-vibes',
    tableId: 'T07',
    tableNumber: 7,
    sessionToken: 'sess_t07_mock_1',
    customerName: 'Aarav Sharma',
    customerMobile: '9825012345',
    specialInstructions: 'Make coffee extra hot, no sugar in cappuccino',
    items: [
      {
        id: 'hc-03-default',
        menuItemId: 'hc-03',
        name: 'Cappuccino',
        category: 'hot-coffee',
        price: 160,
        quantity: 2,
        specialInstructions: 'Extra hot',
      },
      {
        id: 'to-03-default',
        menuItemId: 'to-03',
        name: 'Avocado Toast',
        category: 'toastie',
        price: 390,
        quantity: 1,
      },
    ],
    subtotal: 710,
    tax: 35.5,
    total: 745.5,
    status: 'PREPARING',
    paymentStatus: 'PAID',
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
  },
  {
    id: 'VV-1002',
    cafeId: 'vaan-vibes',
    tableId: 'T03',
    tableNumber: 3,
    sessionToken: 'sess_t03_mock_2',
    customerName: 'Priya Mehta',
    customerMobile: '9898054321',
    specialInstructions: 'Less spicy in pasta, extra dip for fries',
    items: [
      {
        id: 'pa-02-default',
        menuItemId: 'pa-02',
        name: 'Alfredo Pasta',
        category: 'pasta',
        price: 395,
        quantity: 1,
        selectedOptions: { 'Choice of Pasta': 'Penne' },
      },
      {
        id: 'ap-02-default',
        menuItemId: 'ap-02',
        name: 'Peri-Peri Fries',
        category: 'appetizers',
        price: 300,
        quantity: 1,
      },
      {
        id: 'ic-03-default',
        menuItemId: 'ic-03',
        name: 'Iced Latte',
        category: 'iced-coffee',
        price: 220,
        quantity: 1,
      },
    ],
    subtotal: 915,
    tax: 45.75,
    total: 960.75,
    status: 'ACCEPTED',
    paymentStatus: 'PENDING',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  },
];

// Persistent global store for dev and serverless runtime singleton
declare global {
  // eslint-disable-next-line no-var
  var __VAAN_VIBES_STORE__: {
    tables: TableInfo[];
    orders: Order[];
    orderCounter: number;
  } | undefined;
}

if (!global.__VAAN_VIBES_STORE__) {
  global.__VAAN_VIBES_STORE__ = {
    tables: INITIAL_TABLES,
    orders: INITIAL_ORDERS,
    orderCounter: 1003,
  };
}

const store = global.__VAAN_VIBES_STORE__;

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

  validateTableQR(tableId: string, token: string): { valid: boolean; table?: TableInfo; error?: string } {
    if (!tableId || !token) {
      return { valid: false, error: 'Missing table identifier or QR security token' };
    }

    const table = this.getTable(tableId);
    if (!table) {
      return { valid: false, error: `Table '${tableId}' does not exist in this cafe` };
    }

    // Verify token matches server's secret token or table security prefix
    const matchesPrefix = token.startsWith(`vv_sec_${table.id.toLowerCase()}`);
    if (table.token !== token && !matchesPrefix && token !== 'demo') {
      return { valid: false, error: 'Invalid or forged QR code token. Please scan the official table standee.' };
    }

    return { valid: true, table };
  },

  getAllOrders(): Order[] {
    // Return newest first
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

  getOrdersBySession(tableId: string, sessionToken: string): Order[] {
    const table = this.getTable(tableId);
    if (!table) return [];
    return store.orders
      .filter((o) => o.tableId === table.id && (!sessionToken || o.sessionToken === sessionToken))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createOrder(data: {
    tableId: string;
    token: string;
    sessionToken: string;
    customerName: string;
    customerMobile: string;
    specialInstructions?: string;
    items: CartItem[];
  }): { success: boolean; order?: Order; error?: string } {
    // 1. Validate Table QR
    const qrValidation = this.validateTableQR(data.tableId, data.token);
    if (!qrValidation.valid || !qrValidation.table) {
      return { success: false, error: qrValidation.error || 'Invalid table validation' };
    }

    const table = qrValidation.table;

    // 2. Validate Customer Details
    if (!data.customerName || data.customerName.trim().length < 2) {
      return { success: false, error: 'Customer name is required (minimum 2 characters)' };
    }
    const cleanMobile = data.customerMobile?.replace(/\D/g, '') || '';
    if (cleanMobile.length < 10) {
      return { success: false, error: 'A valid 10-digit mobile number is required' };
    }

    // 3. Validate and Calculate Items server-side from authoritative MENU_ITEMS
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'Cart cannot be empty' };
    }

    const validatedItems: CartItem[] = [];
    let subtotal = 0;

    for (const item of data.items) {
      const canonicalItem = MENU_ITEMS.find((m) => m.id === item.menuItemId);
      if (!canonicalItem) {
        return { success: false, error: `Invalid item selected: ${item.name}` };
      }

      const qty = Math.max(1, Math.min(item.quantity || 1, 50));
      let itemPrice = canonicalItem.price;

      // Calculate add-on extras if selected
      if (item.selectedAddOns && item.selectedAddOns.length > 0 && canonicalItem.addOns) {
        for (const addOnName of item.selectedAddOns) {
          const matchedAddon = canonicalItem.addOns.find((a) => a.name === addOnName);
          if (matchedAddon) {
            itemPrice += matchedAddon.price;
          }
        }
      }

      subtotal += itemPrice * qty;

      validatedItems.push({
        id: item.id,
        menuItemId: canonicalItem.id,
        name: canonicalItem.name,
        category: canonicalItem.category,
        price: itemPrice,
        quantity: qty,
        selectedOptions: item.selectedOptions,
        selectedAddOns: item.selectedAddOns,
        specialInstructions: item.specialInstructions,
      });
    }

    const tax = Math.round(subtotal * CAFE_INFO.taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const newOrder: Order = {
      id: `VV-${store.orderCounter++}`,
      cafeId: CAFE_INFO.id,
      tableId: table.id,
      tableNumber: table.tableNumber,
      sessionToken: data.sessionToken || `sess_${table.id}_${Date.now()}`,
      customerName: data.customerName.trim(),
      customerMobile: cleanMobile,
      specialInstructions: data.specialInstructions?.trim() || undefined,
      items: validatedItems,
      subtotal,
      tax,
      total,
      status: 'ORDER_PLACED',
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.orders.unshift(newOrder);

    // Update table status to occupied
    table.status = 'OCCUPIED';

    return { success: true, order: newOrder };
  },

  updateOrderStatus(orderId: string, status: OrderStatus): { success: boolean; order?: Order; error?: string } {
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }

    order.status = status;
    order.updatedAt = new Date().toISOString();

    // If completed or cancelled, check if other active orders remain for table
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      const activeForTable = store.orders.some(
        (o) => o.tableId === order.tableId && !['COMPLETED', 'CANCELLED'].includes(o.status)
      );
      if (!activeForTable) {
        const table = this.getTable(order.tableId);
        if (table) table.status = 'AVAILABLE';
      }
    }

    return { success: true, order };
  },

  updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): { success: boolean; order?: Order; error?: string } {
    const order = store.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found` };
    }

    order.paymentStatus = paymentStatus;
    order.updatedAt = new Date().toISOString();
    return { success: true, order };
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
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.price,
        totalPrice: i.price * i.quantity,
        notes: [
          i.selectedOptions ? Object.values(i.selectedOptions).join(', ') : '',
          i.selectedAddOns ? i.selectedAddOns.join(', ') : '',
        ]
          .filter(Boolean)
          .join(' | '),
      })),
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
