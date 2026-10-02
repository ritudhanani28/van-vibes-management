import { describe, it, expect } from 'vitest';
import { calculateBillBreakdown } from '@/utils/billing';

describe('Authoritative Billing Calculations (Van Vibes)', () => {
  it('1. Single item with quantity 1', () => {
    const items = [{ name: 'Espresso', quantity: 1, unitPrice: 100.0, totalPrice: 100.0 }];
    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const result = calculateBillBreakdown(subtotal, 0, 0);

    expect(result.subtotal).toBe(100.0);
    expect(result.discountAmount).toBe(0.0);
    expect(result.extraCharge).toBe(0.0);
    expect(result.amountAfterAdjustments).toBe(100.0);
    expect(result.roundOff).toBe(0.0);
    expect(result.total).toBe(100.0);
  });

  it('2. Multiple items with different quantities and unit prices (Illustrative data)', () => {
    // Espresso: 2 x 100 = 200
    // Pizza: 1 x 350 = 350
    // Garlic Bread: 2 x 120 = 240
    // Subtotal: 200 + 350 + 240 = 790.00
    const items = [
      { name: 'Espresso', quantity: 2, unitPrice: 100.0, totalPrice: 200.0 },
      { name: 'Pizza', quantity: 1, unitPrice: 350.0, totalPrice: 350.0 },
      { name: 'Garlic Bread', quantity: 2, unitPrice: 120.0, totalPrice: 240.0 },
    ];
    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    expect(subtotal).toBe(790.0);

    const result = calculateBillBreakdown(subtotal, 0, 0);
    expect(result.subtotal).toBe(790.0);
    expect(result.total).toBe(790.0);
    expect(result.roundOff).toBe(0.0);
  });

  it('3. Bill with no discount and no extra charges', () => {
    const result = calculateBillBreakdown(460.0, 0, 0);
    expect(result.subtotal).toBe(460.0);
    expect(result.discountAmount).toBe(0.0);
    expect(result.extraCharge).toBe(0.0);
    expect(result.amountAfterAdjustments).toBe(460.0);
    expect(result.roundOff).toBe(0.0);
    expect(result.total).toBe(460.0);
  });

  it('4. Percentage discount: 10% on 460.00 = 46.00 discount, total 414.00', () => {
    const result = calculateBillBreakdown(460.0, 10, 0);
    expect(result.subtotal).toBe(460.0);
    expect(result.discountPercentage).toBe(10);
    expect(result.discountAmount).toBe(46.0);
    expect(result.amountAfterAdjustments).toBe(414.0);
    expect(result.roundOff).toBe(0.0);
    expect(result.total).toBe(414.0);
  });

  it('5. Additional charge without discount: 460.00 + 25.00 extra = 485.00', () => {
    const result = calculateBillBreakdown(460.0, 0, 25.0);
    expect(result.subtotal).toBe(460.0);
    expect(result.extraCharge).toBe(25.0);
    expect(result.amountAfterAdjustments).toBe(485.0);
    expect(result.roundOff).toBe(0.0);
    expect(result.total).toBe(485.0);
  });

  it('6. Both discount (10%) and additional charge (20.00) on 790.00 subtotal', () => {
    // Subtotal: 790.00
    // Discount (10%): -79.00
    // Extra Charges: +20.00
    // Amount After Adjustments: 731.00
    // Round Off: 0.00
    // Grand Total: 731.00
    const result = calculateBillBreakdown(790.0, 10, 20.0);
    expect(result.subtotal).toBe(790.0);
    expect(result.discountPercentage).toBe(10);
    expect(result.discountAmount).toBe(79.0);
    expect(result.extraCharge).toBe(20.0);
    expect(result.amountAfterAdjustments).toBe(731.0);
    expect(result.roundOff).toBe(0.0);
    expect(result.total).toBe(731.0);
  });

  it('7. Preliminary total requiring positive round-off: 455.70 -> +0.30 -> 456.00', () => {
    const result = calculateBillBreakdown(455.70, 0, 0);
    expect(result.subtotal).toBe(455.70);
    expect(result.amountAfterAdjustments).toBe(455.70);
    expect(result.roundOff).toBe(0.30);
    expect(result.total).toBe(456.0);
  });

  it('7b. Preliminary total requiring positive round-off: 455.80 -> +0.20 -> 456.00', () => {
    const result = calculateBillBreakdown(455.80, 0, 0);
    expect(result.subtotal).toBe(455.80);
    expect(result.amountAfterAdjustments).toBe(455.80);
    expect(result.roundOff).toBe(0.20);
    expect(result.total).toBe(456.0);
  });

  it('8. Preliminary total requiring negative round-off: 454.30 -> -0.30 -> 454.00', () => {
    const result = calculateBillBreakdown(454.30, 0, 0);
    expect(result.subtotal).toBe(454.30);
    expect(result.amountAfterAdjustments).toBe(454.30);
    expect(result.roundOff).toBe(-0.30);
    expect(result.total).toBe(454.0);
  });

  it('9. Whole-rupee total requiring zero round-off: 455.00 -> 0.00 -> 455.00', () => {
    const result = calculateBillBreakdown(455.0, 0, 0);
    expect(result.subtotal).toBe(455.0);
    expect(result.amountAfterAdjustments).toBe(455.0);
    expect(result.roundOff).toBe(0.0);
    expect(result.total).toBe(455.0);
  });

  it('10. Decimal prices and precision-sensitive calculations', () => {
    // 249.50 with 10% disc = 24.95 discount, + 15.00 extra charge
    // Preliminary total: 249.50 - 24.95 + 15.00 = 239.55
    // Grand Total: 240.00, Round Off: +0.45
    const result = calculateBillBreakdown(249.50, 10, 15.0);
    expect(result.subtotal).toBe(249.50);
    expect(result.discountAmount).toBe(24.95);
    expect(result.extraCharge).toBe(15.0);
    expect(result.amountAfterAdjustments).toBe(239.55);
    expect(result.roundOff).toBe(0.45);
    expect(result.total).toBe(240.0);
  });

  it('11. Prevents negative discount and extra charge values', () => {
    const result = calculateBillBreakdown(200.0, -10, -50);
    expect(result.discountPercentage).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.extraCharge).toBe(0);
    expect(result.total).toBe(200.0);
  });
});
