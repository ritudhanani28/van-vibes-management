import { describe, it, expect } from 'vitest';
import { Order, OrderItem } from '@/types/cafe';

describe('Chef Order Preparation Checklist & Done Enforcement', () => {
  const sampleItems: OrderItem[] = [
    {
      id: 'item-1',
      name: 'Cold Brew Coffee',
      price: 180,
      quantity: 1,
      lineTotal: 180,
    },
    {
      id: 'item-2',
      name: 'Garlic Bread with Cheese',
      price: 220,
      quantity: 2,
      lineTotal: 440,
    },
    {
      id: 'item-3',
      name: 'Paneer Tikka Pizza',
      price: 360,
      quantity: 1,
      lineTotal: 360,
    },
  ];

  const sampleOrder: Order = {
    id: 'VV-CHEF-101',
    cafeId: 'cafe-vibes',
    tableId: 'T01',
    tableNumber: 4,
    sessionToken: 'sess-chef-token',
    status: 'ACCEPTED',
    customerName: 'Kavita Sharma',
    customerMobile: '9876543210',
    paymentStatus: 'PENDING',
    subtotal: 980,
    tax: 49,
    total: 1029,
    items: sampleItems,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const getItemKey = (item: OrderItem, idx: number) => {
    return item.id ? String(item.id) : `item-${idx}-${item.name || 'Item'}`;
  };

  const evaluateChefPreparation = (order: Order, checkedKeys: Set<string>) => {
    const pendingItems = order.items.filter((item, idx) => {
      const key = getItemKey(item, idx);
      return !checkedKeys.has(key);
    });

    const allItemsChecked = order.items.length === 0 || pendingItems.length === 0;
    const checkedCount = order.items.length - pendingItems.length;

    return {
      pendingItems,
      allItemsChecked,
      checkedCount,
      canMarkDone: allItemsChecked,
    };
  };

  it('1. Initial state: No items checked, cannot mark Done, all items pending', () => {
    const checkedKeys = new Set<string>();
    const state = evaluateChefPreparation(sampleOrder, checkedKeys);

    expect(state.checkedCount).toBe(0);
    expect(state.pendingItems.length).toBe(3);
    expect(state.allItemsChecked).toBe(false);
    expect(state.canMarkDone).toBe(false);
  });

  it('2. Partial preparation: Checking 1 or 2 items still blocks Done with pending warning', () => {
    // Chef prepares item 1 and item 2
    const checkedKeys = new Set<string>(['item-1', 'item-2']);
    const state = evaluateChefPreparation(sampleOrder, checkedKeys);

    expect(state.checkedCount).toBe(2);
    expect(state.pendingItems.length).toBe(1);
    expect(state.pendingItems[0].id).toBe('item-3');
    expect(state.pendingItems[0].name).toBe('Paneer Tikka Pizza');
    expect(state.allItemsChecked).toBe(false);
    expect(state.canMarkDone).toBe(false);
  });

  it('3. Complete preparation: Checking all 3 items allows order to be marked as Done', () => {
    const checkedKeys = new Set<string>(['item-1', 'item-2', 'item-3']);
    const state = evaluateChefPreparation(sampleOrder, checkedKeys);

    expect(state.checkedCount).toBe(3);
    expect(state.pendingItems.length).toBe(0);
    expect(state.allItemsChecked).toBe(true);
    expect(state.canMarkDone).toBe(true);
  });

  it('4. Toggling behavior: Unchecking an item reverts canMarkDone to false', () => {
    const checkedKeys = new Set<string>(['item-1', 'item-2', 'item-3']);
    expect(evaluateChefPreparation(sampleOrder, checkedKeys).canMarkDone).toBe(true);

    // Chef accidentally unchecks item-2
    checkedKeys.delete('item-2');
    const newState = evaluateChefPreparation(sampleOrder, checkedKeys);

    expect(newState.allItemsChecked).toBe(false);
    expect(newState.canMarkDone).toBe(false);
    expect(newState.pendingItems.map((i) => i.id)).toEqual(['item-2']);
  });

  it('5. Fallback key generation handles items without an explicit id safely', () => {
    const rawItems: OrderItem[] = [
      { id: '', name: 'Masala Chai', price: 50, quantity: 2 },
      { id: '', name: 'Bun Maska', price: 70, quantity: 1 },
    ];
    const key0 = getItemKey(rawItems[0], 0);
    const key1 = getItemKey(rawItems[1], 1);

    expect(key0).toBe('item-0-Masala Chai');
    expect(key1).toBe('item-1-Bun Maska');
    expect(key0).not.toBe(key1);
  });
});
