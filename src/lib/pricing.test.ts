import { describe, expect, it } from "vitest";

import { BOOK_FORMATS } from "@/lib/schemas/book";
import { PRINT_SPECS } from "@/lib/print-specs";
import {
  DELIVERY_FEE_COLOMBO,
  DELIVERY_FEE_ISLANDWIDE,
  FORMAT_PRICING,
  FREE_DELIVERY_THRESHOLD,
  deliveryFee,
  priceBook,
} from "@/lib/pricing";

describe("FORMAT_PRICING", () => {
  it("matches the exact price card", () => {
    expect(FORMAT_PRICING.square_20).toEqual({
      basePrice: 9500,
      includedPages: 20,
      extraPagePrice: 180,
    });
    expect(FORMAT_PRICING.square_26).toEqual({
      basePrice: 12500,
      includedPages: 20,
      extraPagePrice: 220,
    });
    expect(FORMAT_PRICING.landscape_a4).toEqual({
      basePrice: 14500,
      includedPages: 20,
      extraPagePrice: 240,
    });
  });

  it("covers every book format", () => {
    for (const format of BOOK_FORMATS) {
      expect(FORMAT_PRICING[format]).toBeDefined();
    }
  });

  it("includes exactly the minimum page count in the base price for every format", () => {
    // priceBook relies on this: extraPageCount can never go negative.
    for (const format of BOOK_FORMATS) {
      expect(FORMAT_PRICING[format].includedPages).toBe(
        PRINT_SPECS[format].minPages,
      );
    }
  });
});

describe("delivery constants", () => {
  it("has the agreed values", () => {
    expect(FREE_DELIVERY_THRESHOLD).toBe(15000);
    expect(DELIVERY_FEE_COLOMBO).toBe(450);
    expect(DELIVERY_FEE_ISLANDWIDE).toBe(650);
  });
});

describe("deliveryFee", () => {
  it("is free at exactly the threshold", () => {
    expect(deliveryFee(15000, "colombo")).toBe(0);
    expect(deliveryFee(15000, "galle")).toBe(0);
  });

  it("is free above the threshold", () => {
    expect(deliveryFee(15001, "jaffna")).toBe(0);
    expect(deliveryFee(100000, "colombo")).toBe(0);
  });

  it("charges 450 for colombo one rupee below the threshold", () => {
    expect(deliveryFee(14999, "colombo")).toBe(450);
  });

  it("charges 650 for any non-colombo district below the threshold", () => {
    expect(deliveryFee(14999, "galle")).toBe(650);
    expect(deliveryFee(9500, "jaffna")).toBe(650);
    expect(deliveryFee(9500, "nuwara-eliya")).toBe(650);
  });

  it("charges the colombo rate at a low subtotal", () => {
    expect(deliveryFee(9500, "colombo")).toBe(450);
  });
});

describe("priceBook — base prices", () => {
  it("prices a 20-page square_20 at 9500", () => {
    const breakdown = priceBook({ format: "square_20", pageCount: 20 });
    expect(breakdown).toEqual({
      basePrice: 9500,
      extraPageCount: 0,
      extraPagesCost: 0,
      subtotal: 9500,
      delivery: null,
      freeDelivery: false,
      total: 9500,
    });
  });

  it("prices a 20-page square_26 at 12500", () => {
    const breakdown = priceBook({ format: "square_26", pageCount: 20 });
    expect(breakdown.subtotal).toBe(12500);
    expect(breakdown.total).toBe(12500);
    expect(breakdown.extraPageCount).toBe(0);
  });

  it("prices a 20-page landscape_a4 at 14500", () => {
    const breakdown = priceBook({ format: "landscape_a4", pageCount: 20 });
    expect(breakdown.subtotal).toBe(14500);
    expect(breakdown.total).toBe(14500);
    expect(breakdown.freeDelivery).toBe(false);
  });
});

describe("priceBook — extra pages", () => {
  it("prices a 30-page square_20 at 11300 (10 extra pages x 180)", () => {
    const breakdown = priceBook({ format: "square_20", pageCount: 30 });
    expect(breakdown.extraPageCount).toBe(10);
    expect(breakdown.extraPagesCost).toBe(1800);
    expect(breakdown.subtotal).toBe(11300);
    expect(breakdown.total).toBe(11300);
  });

  it("prices a 30-page square_26 at 14700 (10 extra pages x 220)", () => {
    const breakdown = priceBook({ format: "square_26", pageCount: 30 });
    expect(breakdown.extraPagesCost).toBe(2200);
    expect(breakdown.subtotal).toBe(14700);
  });

  it("prices a maximum-size square_20 at 23900 (80 extra pages x 180)", () => {
    const breakdown = priceBook({ format: "square_20", pageCount: 100 });
    expect(breakdown.extraPageCount).toBe(80);
    expect(breakdown.extraPagesCost).toBe(14400);
    expect(breakdown.subtotal).toBe(23900);
    expect(breakdown.freeDelivery).toBe(true);
  });
});

describe("priceBook — delivery and totals", () => {
  it("returns null delivery and total = subtotal when district is omitted", () => {
    const below = priceBook({ format: "square_20", pageCount: 30 });
    expect(below.delivery).toBeNull();
    expect(below.total).toBe(below.subtotal);

    // Even above the free-delivery threshold, omitted district stays null.
    const above = priceBook({ format: "landscape_a4", pageCount: 24 });
    expect(above.subtotal).toBe(15460);
    expect(above.freeDelivery).toBe(true);
    expect(above.delivery).toBeNull();
    expect(above.total).toBe(15460);
  });

  it("adds the colombo fee just below the threshold (landscape_a4 22pp = 14980)", () => {
    const breakdown = priceBook({
      format: "landscape_a4",
      pageCount: 22,
      district: "colombo",
    });
    expect(breakdown.subtotal).toBe(14980);
    expect(breakdown.freeDelivery).toBe(false);
    expect(breakdown.delivery).toBe(450);
    expect(breakdown.total).toBe(15430);
  });

  it("adds the island-wide fee just below the threshold for galle", () => {
    const breakdown = priceBook({
      format: "landscape_a4",
      pageCount: 22,
      district: "galle",
    });
    expect(breakdown.subtotal).toBe(14980);
    expect(breakdown.delivery).toBe(650);
    expect(breakdown.total).toBe(15630);
  });

  it("crossing the threshold zeroes delivery (landscape_a4 24pp = 15460)", () => {
    const breakdown = priceBook({
      format: "landscape_a4",
      pageCount: 24,
      district: "galle",
    });
    expect(breakdown.subtotal).toBe(15460);
    expect(breakdown.freeDelivery).toBe(true);
    expect(breakdown.delivery).toBe(0);
    expect(breakdown.total).toBe(15460);
  });

  it("charges delivery on a cheap colombo order", () => {
    const breakdown = priceBook({
      format: "square_20",
      pageCount: 20,
      district: "colombo",
    });
    expect(breakdown.delivery).toBe(450);
    expect(breakdown.total).toBe(9950);
  });
});

describe("priceBook — validation", () => {
  it("throws on an odd page count", () => {
    expect(() => priceBook({ format: "square_20", pageCount: 21 })).toThrow(
      /even/,
    );
  });

  it("throws on a non-integer page count", () => {
    expect(() => priceBook({ format: "square_20", pageCount: 20.5 })).toThrow(
      /integer/,
    );
    expect(() =>
      priceBook({ format: "square_20", pageCount: Number.NaN }),
    ).toThrow(/integer/);
  });

  it("throws below the minimum page count", () => {
    expect(() => priceBook({ format: "square_20", pageCount: 18 })).toThrow(
      /between 20 and 100/,
    );
    expect(() => priceBook({ format: "landscape_a4", pageCount: 0 })).toThrow(
      /between 20 and 100/,
    );
  });

  it("throws above the maximum page count", () => {
    expect(() => priceBook({ format: "square_26", pageCount: 102 })).toThrow(
      /between 20 and 100/,
    );
  });

  it("accepts both bounds inclusively", () => {
    expect(() => priceBook({ format: "square_26", pageCount: 20 })).not.toThrow();
    expect(() =>
      priceBook({ format: "square_26", pageCount: 100 }),
    ).not.toThrow();
  });
});

describe("priceBook — invariants", () => {
  const pageCounts = [20, 22, 30, 50, 100] as const;
  const districts = [undefined, "colombo", "galle"] as const;

  it("returns whole LKR integers and internally consistent sums everywhere", () => {
    for (const format of BOOK_FORMATS) {
      for (const pageCount of pageCounts) {
        for (const district of districts) {
          const b = priceBook({ format, pageCount, district });
          expect(Number.isInteger(b.basePrice)).toBe(true);
          expect(Number.isInteger(b.extraPagesCost)).toBe(true);
          expect(Number.isInteger(b.subtotal)).toBe(true);
          expect(Number.isInteger(b.total)).toBe(true);
          expect(b.extraPageCount).toBeGreaterThanOrEqual(0);
          expect(b.subtotal).toBe(b.basePrice + b.extraPagesCost);
          expect(b.extraPagesCost).toBe(
            b.extraPageCount * FORMAT_PRICING[format].extraPagePrice,
          );
          expect(b.freeDelivery).toBe(b.subtotal >= FREE_DELIVERY_THRESHOLD);
          expect(b.total).toBe(b.subtotal + (b.delivery ?? 0));
          if (district === undefined) {
            expect(b.delivery).toBeNull();
          } else {
            expect(b.delivery).toBe(deliveryFee(b.subtotal, district));
          }
        }
      }
    }
  });

  it("never charges delivery once free delivery is reached, for any district", () => {
    const b = priceBook({
      format: "square_26",
      pageCount: 100,
      district: "mullaitivu",
    });
    expect(b.subtotal).toBe(12500 + 80 * 220);
    expect(b.freeDelivery).toBe(true);
    expect(b.delivery).toBe(0);
    expect(b.total).toBe(b.subtotal);
  });
});
