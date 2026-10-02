export interface BillBreakdown {
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  extraCharge: number;
  amountAfterAdjustments: number;
  roundOff: number;
  total: number;
}

/**
 * Authoritative financial calculation helper matching backend billing rules:
 * - Subtotal = sum of all line item totals
 * - Discount Amount = Subtotal * Discount Percentage / 100
 * - Amount After Adjustments = Subtotal - Discount Amount + Extra Charges
 * - Grand Total = Round(Amount After Adjustments) to nearest whole rupee
 * - Round Off = Grand Total - Amount After Adjustments
 */
export function calculateBillBreakdown(
  subtotal: number,
  discountPercentage: number = 0,
  extraCharge: number = 0
): BillBreakdown {
  const sub = Math.round((subtotal + Number.EPSILON) * 100) / 100;
  const discPct = Math.max(0, Math.min(100, Math.round((discountPercentage + Number.EPSILON) * 100) / 100));
  const extra = Math.max(0, Math.round((extraCharge + Number.EPSILON) * 100) / 100);

  const discountAmount = Math.round((sub * (discPct / 100) + Number.EPSILON) * 100) / 100;
  const amountAfterAdjustments = Math.round((sub - discountAmount + extra + Number.EPSILON) * 100) / 100;
  const grandTotal = Math.round(amountAfterAdjustments);
  const roundOff = Math.round((grandTotal - amountAfterAdjustments + Number.EPSILON) * 100) / 100;

  return {
    subtotal: sub,
    discountPercentage: discPct,
    discountAmount,
    extraCharge: extra,
    amountAfterAdjustments,
    roundOff,
    total: grandTotal,
  };
}
