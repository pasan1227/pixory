import type { DistrictId } from "@/data/districts";
import { PAGES_PER_SPREAD, PRINT_SPECS } from "@/lib/print-specs";
import type { BookFormat } from "@/types/book";

// ---------------------------------------------------------------------------
// Pricing — the ONLY place prices are computed. Server-authoritative pure
// functions; the client displays values it received and never recomputes.
// All values are whole LKR integers. Format with formatLKR() for display.
// ---------------------------------------------------------------------------

export const FORMAT_PRICING: Record<
  BookFormat,
  { basePrice: number; includedPages: number; extraPagePrice: number }
> = {
  square_20: { basePrice: 9500, includedPages: 20, extraPagePrice: 180 },
  square_26: { basePrice: 12500, includedPages: 20, extraPagePrice: 220 },
  landscape_a4: { basePrice: 14500, includedPages: 20, extraPagePrice: 240 },
};

// Delivery constants live here only — never redeclare elsewhere.
export const FREE_DELIVERY_THRESHOLD = 15000;
export const DELIVERY_FEE_COLOMBO = 450;
export const DELIVERY_FEE_ISLANDWIDE = 650;

export interface PriceBreakdown {
  basePrice: number;
  extraPageCount: number;
  extraPagesCost: number;
  subtotal: number;
  // null when no district is known yet (editor header before address entry).
  delivery: number | null;
  freeDelivery: boolean;
  total: number;
}

export function deliveryFee(subtotal: number, district: DistrictId): number {
  if (subtotal >= FREE_DELIVERY_THRESHOLD) {
    return 0;
  }
  return district === "colombo"
    ? DELIVERY_FEE_COLOMBO
    : DELIVERY_FEE_ISLANDWIDE;
}

// Developer-facing errors — invalid page counts indicate a caller bug, not a
// user input path, so these messages are intentionally not i18n'd.
function assertValidPageCount(format: BookFormat, pageCount: number): void {
  const { minPages, maxPages } = PRINT_SPECS[format];
  if (!Number.isInteger(pageCount)) {
    throw new Error(`pageCount must be an integer, got ${pageCount}`);
  }
  if (pageCount % PAGES_PER_SPREAD !== 0) {
    throw new Error(
      `pageCount must be even (a spread is ${PAGES_PER_SPREAD} pages), got ${pageCount}`,
    );
  }
  if (pageCount < minPages || pageCount > maxPages) {
    throw new Error(
      `pageCount for format "${format}" must be between ${minPages} and ${maxPages}, got ${pageCount}`,
    );
  }
}

export function priceBook(input: {
  format: BookFormat;
  pageCount: number;
  district?: DistrictId;
}): PriceBreakdown {
  const { format, pageCount, district } = input;
  assertValidPageCount(format, pageCount);

  const { basePrice, includedPages, extraPagePrice } = FORMAT_PRICING[format];
  // Never negative: includedPages equals minPages for every format.
  const extraPageCount = pageCount - includedPages;
  const extraPagesCost = extraPageCount * extraPagePrice;
  const subtotal = basePrice + extraPagesCost;
  const freeDelivery = subtotal >= FREE_DELIVERY_THRESHOLD;
  const delivery =
    district === undefined ? null : deliveryFee(subtotal, district);

  return {
    basePrice,
    extraPageCount,
    extraPagesCost,
    subtotal,
    delivery,
    freeDelivery,
    total: subtotal + (delivery ?? 0),
  };
}
