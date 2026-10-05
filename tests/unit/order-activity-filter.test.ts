import { describe, it, expect } from 'vitest';
import { isOrderActive, isOrderInactive, Order, ActivityFilterOption } from '@/types/cafe';

describe('Order Active / Inactive 3-State Filter Lifecycle', () => {
  const baseOrder: Order = {
    id: 'ORD-BASE-1',
    cafeId: 'cafe-1',
    tableId: 'tbl-1',
    tableNumber: 3,
    status: 'PLACED',
    sessionToken: 'token-1',
    customerName: 'Default Guest',
    customerMobile: '9999999999',
    paymentStatus: 'PENDING',
    subtotal: 500,
    tax: 25,
    total: 525,
    items: [{ id: 'item-1', name: 'Masala Chai', price: 50, quantity: 2, lineTotal: 100 }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  describe('Lifecycle Edge Cases Matrix (Specification Table)', () => {
    it('1. Placed | Bill: No | Payment: — -> ACTIVE', () => {
      const order = { ...baseOrder, status: 'PLACED' as const, billGenerated: false, paymentStatus: 'PENDING' as const };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);
    });

    it('2. Accepted | Bill: No | Payment: — -> ACTIVE', () => {
      const order = { ...baseOrder, status: 'ACCEPTED' as const, billGenerated: false, paymentStatus: 'PENDING' as const };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);
    });

    it('3. In Kitchen | Bill: No | Payment: — -> ACTIVE', () => {
      const order = { ...baseOrder, status: 'IN_KITCHEN' as const, billGenerated: false, paymentStatus: 'PENDING' as const };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);
    });

    it('4. Completed | Bill: No | Payment: — -> ACTIVE (Bill not generated)', () => {
      const order = { ...baseOrder, status: 'COMPLETED' as const, billGenerated: false, paymentStatus: 'PENDING' as const };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);
    });

    it('5. Completed | Bill: Yes | Payment: Pending -> ACTIVE', () => {
      const order = { ...baseOrder, status: 'COMPLETED' as const, billGenerated: true, paymentStatus: 'PENDING' as const };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);
    });

    it('6. Completed | Bill: Yes | Payment: Failed -> ACTIVE', () => {
      const order = { ...baseOrder, status: 'COMPLETED' as const, billGenerated: true, paymentStatus: 'FAILED' as const };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);
    });

    it('7. Completed | Bill: Yes | Payment: Paid -> INACTIVE (Lifecycle completely finished)', () => {
      const order = { ...baseOrder, status: 'COMPLETED' as const, billGenerated: true, paymentStatus: 'PAID' as const };
      expect(isOrderActive(order)).toBe(false);
      expect(isOrderInactive(order)).toBe(true);
    });
  });

  describe('3-State Filter Application & Default Behavior', () => {
    const orders: Order[] = [
      { ...baseOrder, id: 'O1', status: 'PLACED', billGenerated: false, paymentStatus: 'PENDING' },
      { ...baseOrder, id: 'O2', status: 'ACCEPTED', billGenerated: false, paymentStatus: 'PENDING' },
      { ...baseOrder, id: 'O3', status: 'IN_KITCHEN', billGenerated: false, paymentStatus: 'PENDING' },
      { ...baseOrder, id: 'O4', status: 'COMPLETED', billGenerated: false, paymentStatus: 'PENDING' },
      { ...baseOrder, id: 'O5', status: 'COMPLETED', billGenerated: true, paymentStatus: 'PENDING' },
      { ...baseOrder, id: 'O6', status: 'COMPLETED', billGenerated: true, paymentStatus: 'PAID' },
    ];

    const applyFilter = (list: Order[], filter: ActivityFilterOption) => {
      return list.filter((o) => {
        if (filter === 'ACTIVE') return !isOrderInactive(o);
        if (filter === 'INACTIVE') return isOrderInactive(o);
        return true;
      });
    };

    it('Requirement: Default filter MUST be ACTIVE and exclude settled orders', () => {
      const filtered = applyFilter(orders, 'ACTIVE');
      expect(filtered.map((o) => o.id)).toEqual(['O1', 'O2', 'O3', 'O4', 'O5']);
      expect(filtered.length).toBe(5);
      expect(filtered.some((o) => o.id === 'O6')).toBe(false);
    });

    it('Filter: ALL shows every order regardless of state', () => {
      const filtered = applyFilter(orders, 'ALL');
      expect(filtered.length).toBe(6);
    });

    it('Filter: INACTIVE shows ONLY fully finished orders (Completed + Bill Generated + Paid)', () => {
      const filtered = applyFilter(orders, 'INACTIVE');
      expect(filtered.map((o) => o.id)).toEqual(['O6']);
      expect(filtered.length).toBe(1);
    });
  });

  describe('Real-Time Lifecycle State Transitions', () => {
    it('Order progresses through stages and moves from Active to Inactive only upon payment', () => {
      let order: Order = {
        ...baseOrder,
        id: 'LIFECYCLE-1',
        status: 'PLACED',
        billGenerated: false,
        paymentStatus: 'PENDING',
      };

      // Step 1: Placed -> Active
      expect(isOrderActive(order)).toBe(true);

      // Step 2: Accepted -> Active
      order = { ...order, status: 'ACCEPTED' };
      expect(isOrderActive(order)).toBe(true);

      // Step 3: In Kitchen -> Active
      order = { ...order, status: 'IN_KITCHEN' };
      expect(isOrderActive(order)).toBe(true);

      // Step 4: Completed (Bill NOT generated) -> Remains Active!
      order = { ...order, status: 'COMPLETED' };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);

      // Step 5: Bill Generated (Payment still pending) -> Remains Active!
      order = { ...order, billGenerated: true };
      expect(isOrderActive(order)).toBe(true);
      expect(isOrderInactive(order)).toBe(false);

      // Step 6: Payment Settled -> Moves to Inactive!
      order = { ...order, paymentStatus: 'PAID' };
      expect(isOrderActive(order)).toBe(false);
      expect(isOrderInactive(order)).toBe(true);
    });
  });

  describe('Interaction With Existing Filters (Composability)', () => {
    const composableOrders: Order[] = [
      {
        ...baseOrder,
        id: 'T1-ACTIVE',
        tableNumber: 1,
        status: 'ACCEPTED',
        billGenerated: false,
        paymentStatus: 'PENDING',
        customerName: 'Alice',
      },
      {
        ...baseOrder,
        id: 'T1-INACTIVE',
        tableNumber: 1,
        status: 'COMPLETED',
        billGenerated: true,
        paymentStatus: 'PAID',
        customerName: 'Bob',
      },
      {
        ...baseOrder,
        id: 'T2-ACTIVE',
        tableNumber: 2,
        status: 'PLACED',
        billGenerated: false,
        paymentStatus: 'PENDING',
        customerName: 'Charlie',
      },
    ];

    const evaluate = (orders: Order[], activity: ActivityFilterOption, table: string, query: string) => {
      return orders.filter((o) => {
        if (activity === 'ACTIVE' && isOrderInactive(o)) return false;
        if (activity === 'INACTIVE' && !isOrderInactive(o)) return false;
        if (table !== 'ALL' && o.tableNumber.toString() !== table) return false;
        if (query && !o.customerName?.toLowerCase().includes(query)) return false;
        return true;
      });
    };

    it('Activity: ACTIVE + Table: 1 returns only active orders at Table 1', () => {
      const result = evaluate(composableOrders, 'ACTIVE', '1', '');
      expect(result.map((o) => o.id)).toEqual(['T1-ACTIVE']);
    });

    it('Activity: INACTIVE + Table: 1 returns only inactive orders at Table 1', () => {
      const result = evaluate(composableOrders, 'INACTIVE', '1', '');
      expect(result.map((o) => o.id)).toEqual(['T1-INACTIVE']);
    });

    it('Activity: ACTIVE + Search: "Charlie" returns Charlies active order', () => {
      const result = evaluate(composableOrders, 'ACTIVE', 'ALL', 'charlie');
      expect(result.map((o) => o.id)).toEqual(['T2-ACTIVE']);
    });
  });
});
