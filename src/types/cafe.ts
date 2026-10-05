export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'IN_KITCHEN'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ORDER_PLACED'
  | 'PREPARING'
  | 'READY';

export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';

export type SessionStatus = 'OPEN' | 'BILL_GENERATED' | 'CLOSED';

export interface DiningSession {
  id: string; // e.g. 'DS-1001'
  tableId: string;
  tableNumber: number;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  orderCount?: number;
  totalAmount?: number;
  paymentStatus?: string;
  tableStatus?: string;
}

export interface TableInfo {
  id: string; // e.g., 'T01'
  tableNumber: number; // e.g., 1
  name: string; // e.g., 'Table 01'
  token: string; // Secure random token
  qrCodeUrl: string; // Full URL or relative path to scan
  capacity: number;
  status: TableStatus;
  activeSession?: DiningSession;
}

export interface MenuItemOption {
  name: string; // e.g., 'Choice of Pasta', 'Flavors'
  choices: {
    name: string;
    extraPrice?: number;
  }[];
}

export interface MenuItemAddOn {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  isVeg: boolean;
  options?: MenuItemOption[];
  addOns?: MenuItemAddOn[];
  image?: string;
  popular?: boolean;
  isAvailable?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  page: number; // PDF page reference
}

export interface OrderItem {
  id: string;
  menuItemId?: string;
  name: string;
  item_name?: string;
  category?: string;
  price: number;
  unitPrice?: number;
  unit_price?: number;
  itemTotal?: number;
  item_total?: number;
  lineTotal?: number;
  line_total?: number;
  quantity: number;
  selectedOptions?: { [key: string]: string };
  selectedAddOns?: string[];
  specialInstructions?: string;
}

export type CartItem = OrderItem;

export interface CustomerDetails {
  name: string;
  mobile: string;
  specialInstructions?: string;
}

export type OrderActivityStatus = 'ACTIVE' | 'INACTIVE';
export type ActivityFilterOption = 'ACTIVE' | 'ALL' | 'INACTIVE';

export interface Order {
  id: string; // e.g., 'VV-1001'
  cafeId: string;
  tableId: string;
  tableNumber: number;
  diningSessionId?: string;
  sessionToken: string;
  customerName: string;
  customerMobile: string;
  specialInstructions?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number; // 5% GST
  discountPercentage?: number;
  discountAmount?: number;
  extraCharge?: number;
  amountAfterAdjustments?: number;
  roundOff?: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  sessionStatus?: SessionStatus;
  billGenerated?: boolean;
  activityStatus?: OrderActivityStatus;
  isActive?: boolean;
  cancellationReason?: string;
  cancellation_reason?: string;
  cancellationNote?: string;
  cancellation_note?: string;
  cancelledBy?: string;
  cancelled_by?: string;
  cancelledAt?: string;
  cancelled_at?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluates whether an order is Inactive according to authoritative business rules:
 * An order becomes Inactive ONLY when:
 *   order_completed = true (status === 'COMPLETED')
 *   AND bill_generated = true
 *   AND payment_status = 'PAID'
 */
export function isOrderInactive(order: {
  status?: string;
  billGenerated?: boolean;
  paymentStatus?: string;
  activityStatus?: string;
}): boolean {
  const status = (order.status || '').toUpperCase();
  if (status === 'CANCELLED') {
    return true;
  }
  const billGen = Boolean(order.billGenerated);
  const payment = (order.paymentStatus || '').toUpperCase();

  // Fully finished lifecycle: Completed + Bill Generated + Paid
  if (status === 'COMPLETED' && billGen && payment === 'PAID') {
    return true;
  }

  // If status is known and not completed, or bill known not generated, or payment not paid, it is ACTIVE
  if (status && status !== 'COMPLETED') {
    return false;
  }
  if (order.billGenerated === false) {
    return false;
  }
  if (order.paymentStatus && payment !== 'PAID') {
    return false;
  }

  // Fallback to backend-provided activityStatus
  if (order.activityStatus) {
    return order.activityStatus.toUpperCase() === 'INACTIVE';
  }

  return false;
}

/**
 * Evaluates whether an order is Active:
 * An order is Active when it still requires action or its billing/payment lifecycle is not completely finished:
 * - Placed
 * - Accepted
 * - In Kitchen / Cooking
 * - Completed + Bill Not Generated
 * - Bill Generated + Payment Pending/Failed
 */
export function isOrderActive(order: {
  status?: string;
  billGenerated?: boolean;
  paymentStatus?: string;
  activityStatus?: string;
}): boolean {
  return !isOrderInactive(order);
}

export interface CafeDetails {
  id: string;
  name: string;
  hindiName: string;
  tagline: string;
  address: string;
  phone: string;
  gstin: string;
  currency: string;
  taxRate: number; // 0.05
  logoUrl?: string;
  logoDataUrl?: string;
}

export interface IncompleteOrderItem {
  order_id?: string;
  orderId?: string;
  order_number?: string;
  orderNumber?: string;
  table_number?: number;
  tableNumber?: number;
  status: string;
  items?: Array<{ name: string; quantity: number }>;
}

export interface BillData {
  billNumber: string;
  orderId?: string;
  diningSessionId?: string;
  orderIds?: string[];
  billType?: string;
  sessionStatus?: SessionStatus;
  tableStatus?: TableStatus;
  cafe: CafeDetails;
  tableNumber: number;
  customerName: string;
  customerMobile: string;
  specialInstructions?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    baseUnitPrice?: number;
    baseTotalPrice?: number;
    notes?: string;
    extras?: {
      name: string;
      price: number;
      total: number;
    }[];
  }[];
  subtotal: number;
  cgst: number;
  sgst: number;
  taxAmount: number;
  discountPercentage?: number;
  discountAmount?: number;
  extraCharge?: number;
  amountAfterAdjustments?: number;
  roundOff?: number;
  total: number;
  paymentStatus: PaymentStatus;
  upiId?: string;
  upiPayeeName?: string;
  paymentQrCode?: string;
  createdAt: string;
  hasIncompleteOrders?: boolean;
  incompleteOrders?: IncompleteOrderItem[];
}


export interface InvoiceLedgerItem {
  id: string;
  orderId?: string | null;
  diningSessionId?: string | null;
  billType?: string;
  invoiceNumber: string;
  tableNumber?: number;
  customerName?: string;
  subtotal: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  taxAmount: number;
  discountPercentage: number;
  discountAmount: number;
  extraCharge?: number;
  roundOff?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  settledAt?: string | null;
  createdAt: string;
  tableStatus?: string | null;
}
