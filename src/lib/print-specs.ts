import type { BookFormat } from "@/types/book";
import type { SlotDef } from "@/types/layout";

// Physical print specification per book format. The same normalized document
// renders on screen (CSS px) and in print (300 DPI) from these numbers.
export interface PrintSpec {
  format: BookFormat;
  // Single page trim size.
  pageWidthMm: number;
  pageHeightMm: number;
  // Bleed beyond trim on every outer edge.
  bleedMm: number;
  // Page-count rules. A spread is always 2 pages, so counts move in steps of 2.
  minPages: number;
  maxPages: number;
  // Spine text becomes printable above this page count.
  spineTextMinPages: number;
}

export const PRINT_SPECS: Record<BookFormat, PrintSpec> = {
  square_20: {
    format: "square_20",
    pageWidthMm: 200,
    pageHeightMm: 200,
    bleedMm: 3,
    minPages: 20,
    maxPages: 100,
    spineTextMinPages: 50,
  },
  square_26: {
    format: "square_26",
    pageWidthMm: 260,
    pageHeightMm: 260,
    bleedMm: 3,
    minPages: 20,
    maxPages: 100,
    spineTextMinPages: 50,
  },
  landscape_a4: {
    format: "landscape_a4",
    pageWidthMm: 297,
    pageHeightMm: 210,
    bleedMm: 3,
    minPages: 20,
    maxPages: 100,
    spineTextMinPages: 50,
  },
};

export const PAGES_PER_SPREAD = 2;

export function spreadWidthMm(spec: PrintSpec): number {
  return spec.pageWidthMm * 2;
}

// Width / height of the full double-page spread.
export function spreadAspectRatio(format: BookFormat): number {
  const spec = PRINT_SPECS[format];
  return spreadWidthMm(spec) / spec.pageHeightMm;
}

// Physical size of a layout slot for a given format. Slot rects are
// normalized to the spread (x/w over double-page width, y/h over page height).
// Bleed is intentionally ignored here: 3mm on a 400mm spread shifts effective
// DPI by under 1% and never crosses a policy threshold.
export function slotPhysicalSizeMm(
  format: BookFormat,
  slot: Pick<SlotDef, "w" | "h">,
): { widthMm: number; heightMm: number } {
  const spec = PRINT_SPECS[format];
  return {
    widthMm: slot.w * spreadWidthMm(spec),
    heightMm: slot.h * spec.pageHeightMm,
  };
}

// Physical aspect ratio (width / height) of a slot when printed.
export function slotAspectRatio(
  format: BookFormat,
  slot: Pick<SlotDef, "w" | "h">,
): number {
  const { widthMm, heightMm } = slotPhysicalSizeMm(format, slot);
  return widthMm / heightMm;
}

export function pageCountOf(spreadCount: number): number {
  return spreadCount * PAGES_PER_SPREAD;
}

export function spreadBounds(format: BookFormat): {
  minSpreads: number;
  maxSpreads: number;
} {
  const spec = PRINT_SPECS[format];
  return {
    minSpreads: spec.minPages / PAGES_PER_SPREAD,
    maxSpreads: spec.maxPages / PAGES_PER_SPREAD,
  };
}
