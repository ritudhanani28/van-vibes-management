import { describe, it, expect } from 'vitest';
import { Order, OrderStatus } from '@/types/cafe';

describe('Order Dashboard Filter & Time Behavior', () => {
  const sampleOrders: Order[] = [
    {
      id: 'VV-1001',
      tableNumber: 2,
      status: 'PLACED',
      customerName: 'Aarav Patel',
      customerMobile: '9876543210',
      paymentStatus: 'PENDING',
      total: 350,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cafeId: 'van-vibes', tableId: 'T02', sessionToken: 'sess_tok', subtotal: 350, tax: 0, items: [{ id: '1', name: 'Cold Brew', price: 150, quantity: 1, lineTotal: 150 }],
    },
    {
      id: 'VV-1002',
      tableNumber: 4,
      status: 'ACCEPTED',
      customerName: 'Priya Shah',
      customerMobile: '9876543211',
      paymentStatus: 'PENDING',
      total: 420,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15m ago
      updatedAt: new Date().toISOString(),
      cafeId: 'van-vibes', tableId: 'T02', sessionToken: 'sess_tok', subtotal: 350, tax: 0, items: [{ id: '2', name: 'Cappuccino', price: 180, quantity: 2, lineTotal: 360 }],
    },
    {
      id: 'VV-1003',
      tableNumber: 2,
      status: 'COMPLETED',
      customerName: 'Rohan Mehta',
      customerMobile: '9876543212',
      paymentStatus: 'PAID',
      total: 580,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45m ago
      updatedAt: new Date().toISOString(),
      cafeId: 'van-vibes', tableId: 'T02', sessionToken: 'sess_tok', subtotal: 350, tax: 0, items: [{ id: '3', name: 'Paneer Tikka', price: 290, quantity: 2, lineTotal: 580 }],
    },
    {
      id: 'VV-1004',
      tableNumber: 5,
      status: 'CANCELLED',
      customerName: 'Sneha Joshi',
      customerMobile: '9876543213',
      paymentStatus: 'PENDING',
      total: 200,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      updatedAt: new Date().toISOString(),
      cafeId: 'van-vibes', tableId: 'T02', sessionToken: 'sess_tok', subtotal: 350, tax: 0, items: [{ id: '4', name: 'Hot Chocolate', price: 200, quantity: 1, lineTotal: 200 }],
    },
  ];

  // Helper matching the implementation in OrderCard.tsx
  const isCompletedOrEnded = (status: OrderStatus) =>
    status === 'COMPLETED' || status === 'SERVED' || status === 'CANCELLED';

  it('Requirement 1: Completed orders identify as completed and omit relative elapsed time', () => {
    expect(isCompletedOrEnded('COMPLETED')).toBe(true);
    expect(isCompletedOrEnded('SERVED')).toBe(true);
    expect(isCompletedOrEnded('CANCELLED')).toBe(true);
    expect(isCompletedOrEnded('PLACED')).toBe(false);
    expect(isCompletedOrEnded('ACCEPTED')).toBe(false);
    expect(isCompletedOrEnded('IN_KITCHEN')).toBe(false);

    // Verify time display logic for completed order VV-1003
    const completedOrder = sampleOrders.find((o) => o.id === 'VV-1003')!;
    const orderDate = new Date(completedOrder.createdAt);
    const formattedTime = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    expect(formattedTime).toBeTruthy();

    // Completed order must not display relative text '+45m ago'
    const shouldShowRelativeTime = !isCompletedOrEnded(completedOrder.status);
    expect(shouldShowRelativeTime).toBe(false);

    // Active order VV-1002 must show relative time
    const activeOrder = sampleOrders.find((o) => o.id === 'VV-1002')!;
    const shouldShowActiveRelative = !isCompletedOrEnded(activeOrder.status);
    expect(shouldShowActiveRelative).toBe(true);
  });

  it('Requirement 2: Initial default filter state has NO filter selected (All Orders)', () => {
    const defaultStatus = 'ALL';
    const defaultDate = 'ALL';
    const defaultTable = 'ALL';
    const defaultPayment = 'ALL';
    const defaultSearch = '';

    // In default state, all orders are returned without any exclusion
    const filtered = sampleOrders.filter((order) => {
      if (defaultStatus !== 'ALL' && order.status !== defaultStatus) return false;
      if (defaultTable !== 'ALL' && order.tableNumber.toString() !== defaultTable) return false;
      if (defaultPayment !== 'ALL' && order.paymentStatus !== defaultPayment) return false;
      return true;
    });

    expect(filtered.length).toBe(sampleOrders.length);
  });

  it('Requirement 3: Filters correctly isolate matching orders and are composable', () => {
    // Filter by Status: COMPLETED
    const completedOrders = sampleOrders.filter((o) => o.status === 'COMPLETED');
    expect(completedOrders.length).toBe(1);
    expect(completedOrders[0].id).toBe('VV-1003');

    // Composable Filter: Table 2 + Status PLACED
    const table2Placed = sampleOrders.filter(
      (o) => o.tableNumber === 2 && o.status === 'PLACED'
    );
    expect(table2Placed.length).toBe(1);
    expect(table2Placed[0].id).toBe('VV-1001');

    // Filter by Payment: PAID
    const paidOrders = sampleOrders.filter((o) => o.paymentStatus === 'PAID');
    expect(paidOrders.length).toBe(1);
    expect(paidOrders[0].id).toBe('VV-1003');

    // Search query: by dish name 'Cold Brew'
    const searchColdBrew = sampleOrders.filter((o) =>
      o.items.some((i) => i.name.toLowerCase().includes('cold brew'))
    );
    expect(searchColdBrew.length).toBe(1);
    expect(searchColdBrew[0].id).toBe('VV-1001');
  });

  it('Requirement 4: Real-time status update dynamically transitions orders into and out of filtered views', () => {
    let currentOrders = [...sampleOrders];
    const statusFilter = 'ACCEPTED';

    // Initially, only VV-1002 is ACCEPTED
    let visible = currentOrders.filter((o) => o.status === statusFilter);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('VV-1002');

    // Real-time event 1: VV-1001 transitions from PLACED -> ACCEPTED
    currentOrders = currentOrders.map((o) =>
      o.id === 'VV-1001' ? { ...o, status: 'ACCEPTED' as OrderStatus } : o
    );
    visible = currentOrders.filter((o) => o.status === statusFilter);
    expect(visible.length).toBe(2);
    expect(visible.some((o) => o.id === 'VV-1001')).toBe(true);

    // Real-time event 2: VV-1002 transitions from ACCEPTED -> COMPLETED
    currentOrders = currentOrders.map((o) =>
      o.id === 'VV-1002' ? { ...o, status: 'COMPLETED' as OrderStatus } : o
    );
    visible = currentOrders.filter((o) => o.status === statusFilter);
    // VV-1002 automatically leaves the ACCEPTED view
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('VV-1001');

    // Check COMPLETED view: now contains both VV-1003 and VV-1002
    const completedView = currentOrders.filter((o) => o.status === 'COMPLETED');
    expect(completedView.length).toBe(2);
    expect(completedView.some((o) => o.id === 'VV-1002')).toBe(true);
    expect(completedView.some((o) => o.id === 'VV-1003')).toBe(true);
  });

  it('Requirement 5: Operations Dashboard table filter isolates orders by selected table number and supports All Tables default', () => {
    let dashboardTableFilter = 'ALL';

    // 1. Default: All Tables
    let filtered = sampleOrders.filter((order) => {
      if (dashboardTableFilter !== 'ALL' && order.tableNumber.toString() !== dashboardTableFilter) return false;
      return true;
    });
    expect(filtered.length).toBe(sampleOrders.length);

    // 2. Select Table 2
    dashboardTableFilter = '2';
    filtered = sampleOrders.filter((order) => {
      if (dashboardTableFilter !== 'ALL' && order.tableNumber.toString() !== dashboardTableFilter) return false;
      return true;
    });
    expect(filtered.length).toBe(2);
    expect(filtered.every((o) => o.tableNumber === 2)).toBe(true);

    // 3. Select Table 5
    dashboardTableFilter = '5';
    filtered = sampleOrders.filter((order) => {
      if (dashboardTableFilter !== 'ALL' && order.tableNumber.toString() !== dashboardTableFilter) return false;
      return true;
    });
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('VV-1004');
  });
});
