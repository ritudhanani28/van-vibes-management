import { describe, it, expect } from "vitest";
import { Order, OrderItem } from "@/types/cafe";
import {
  isKotItem,
  isChefItem,
  getOrderKotItems,
  getOrderChefItems,
  canCompleteOrder,
  setKotOrderDone,
} from "@/utils/kot";

describe("KOT vs Chef Routing & Station Separation", () => {
  const coffeeItem: OrderItem = {
    id: "item-c1",
    name: "Cappuccino",
    category: "hot-coffee",
    price: 150,
    quantity: 1,
  };

  const mocktailItem: OrderItem = {
    id: "item-m1",
    name: "Virgin Mojito",
    category: "non-coffee",
    price: 180,
    quantity: 1,
  };

  const shakeItem: OrderItem = {
    id: "item-s1",
    name: "Nutella Shake",
    category: "shake",
    price: 220,
    quantity: 1,
  };

  const dessertItem: OrderItem = {
    id: "item-d1",
    name: "Sizzling Brownie",
    category: "dessert",
    price: 250,
    quantity: 1,
  };

  const riceItem: OrderItem = {
    id: "item-r1",
    name: "Mexican Fried Rice",
    category: "rice",
    price: 280,
    quantity: 1,
  };

  const sizzlerItem: OrderItem = {
    id: "item-sz1",
    name: "Paneer Shashlik Sizzler",
    category: "sizzlers",
    price: 420,
    quantity: 1,
  };

  const pizzaItem: OrderItem = {
    id: "item-p1",
    name: "Margherita Pizza",
    category: "pizza",
    price: 320,
    quantity: 1,
  };

  it("1. Accurately identifies KOT items (Hot Coffee, Iced Coffee, Non Coffee, Manual Brew, Shake, Frappe, Dessert)", () => {
    expect(isKotItem(coffeeItem)).toBe(true);
    expect(isKotItem(mocktailItem)).toBe(true);
    expect(isKotItem(shakeItem)).toBe(true);
    expect(isKotItem(dessertItem)).toBe(true);

    expect(isChefItem(coffeeItem)).toBe(false);
    expect(isChefItem(mocktailItem)).toBe(false);
  });

  it("2. Accurately identifies Chef kitchen items (Rice, Sizzler, Pizza, etc.)", () => {
    expect(isChefItem(riceItem)).toBe(true);
    expect(isChefItem(sizzlerItem)).toBe(true);
    expect(isChefItem(pizzaItem)).toBe(true);

    expect(isKotItem(riceItem)).toBe(false);
    expect(isKotItem(sizzlerItem)).toBe(false);
  });

  it("3. User example: Table 1 with Coffee, Mocktail, Rice, Sizzler splits correctly", () => {
    const table1Order: Order = {
      id: "VV-TBL1-TEST",
      cafeId: "van-vibes",
      tableId: "T01",
      tableNumber: 1,
      sessionToken: "sess-tbl1",
      customerName: "Ritu D",
      customerMobile: "9904990790",
      status: "ACCEPTED",
      paymentStatus: "PENDING",
      subtotal: 1030,
      tax: 51.5,
      total: 1081.5,
      items: [coffeeItem, mocktailItem, riceItem, sizzlerItem],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const kotItems = getOrderKotItems(table1Order);
    const chefItems = getOrderChefItems(table1Order);

    // KOT should have only Coffee and Mocktail
    expect(kotItems.length).toBe(2);
    expect(kotItems.map((i) => i.name)).toEqual(["Cappuccino", "Virgin Mojito"]);

    // Chef should have only Rice and Sizzler
    expect(chefItems.length).toBe(2);
    expect(chefItems.map((i) => i.name)).toEqual(["Mexican Fried Rice", "Paneer Shashlik Sizzler"]);
  });

  it("4. Order Completion validation: Blocks completion if either Chef or KOT is pending", () => {
    const mixedOrder: Order = {
      id: "VV-MIXED-101",
      cafeId: "van-vibes",
      tableId: "T01",
      tableNumber: 1,
      sessionToken: "sess-mixed",
      customerName: "Ritu D",
      customerMobile: "9904990790",
      status: "ACCEPTED", // Chef has NOT marked Done
      paymentStatus: "PENDING",
      subtotal: 700,
      tax: 35,
      total: 735,
      items: [coffeeItem, sizzlerItem],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Both are pending initially
    const result1 = canCompleteOrder(mixedOrder);
    expect(result1.canComplete).toBe(false);
    expect(result1.isChefPending).toBe(true);
    expect(result1.isKotPending).toBe(true);

    // Chef marks Done (status transitions to IN_KITCHEN)
    const chefDoneOrder: Order = {
      ...mixedOrder,
      status: "IN_KITCHEN",
    };

    // Chef is done, but KOT is still pending
    const result2 = canCompleteOrder(chefDoneOrder);
    expect(result2.canComplete).toBe(false);
    expect(result2.isChefPending).toBe(false);
    expect(result2.isKotPending).toBe(true);

    // Now Admin marks KOT Done
    setKotOrderDone(mixedOrder.id, true);
    const result3 = canCompleteOrder(chefDoneOrder);
    expect(result3.canComplete).toBe(true);
    expect(result3.isChefPending).toBe(false);
    expect(result3.isKotPending).toBe(false);

    // Cleanup
    setKotOrderDone(mixedOrder.id, false);
  });
});
