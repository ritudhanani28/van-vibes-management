import { describe, it, expect } from 'vitest';
import { OrderItem } from '@/types/cafe';

describe('Order Calculations & Types', () => {
  const sampleItems: OrderItem[] = [
    {
      id: 'item-1',
      name: 'Espresso',
      price: 140,
      unitPrice: 140,
      quantity: 2,
      lineTotal: 280,
    },
    {
      id: 'item-2',
      name: 'Cappuccino',
      price: 180,
      unit_price: 180,
      quantity: 1,
      line_total: 180,
    },
  ];

  it('should accurately sum units and unique items count', () => {
    const totalUnits = sampleItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const uniqueCount = sampleItems.length;

    expect(totalUnits).toBe(3);
    expect(uniqueCount).toBe(2);
  });

  it('should handle snake_case and camelCase price fallbacks safely', () => {
    const item1 = sampleItems[0];
    const item2 = sampleItems[1];

    const price1 = item1.unitPrice ?? item1.unit_price ?? item1.price;
    const price2 = item2.unitPrice ?? item2.unit_price ?? item2.price;

    expect(price1).toBe(140);
    expect(price2).toBe(180);

    const total1 = item1.lineTotal ?? item1.line_total ?? (price1 * item1.quantity);
    const total2 = item2.lineTotal ?? item2.line_total ?? (price2 * item2.quantity);

    expect(total1).toBe(280);
    expect(total2).toBe(180);
  });

  it('should calculate subtotal, 5% tax, and total accurately', () => {
    const subtotal = sampleItems.reduce((acc, i) => acc + (i.lineTotal || i.line_total || 0), 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + tax;

    expect(subtotal).toBe(460);
    expect(tax).toBe(23);
    expect(total).toBe(483);
  });
});
