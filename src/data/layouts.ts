import type { CoverLayout, SpreadLayout } from "@/types/layout";

// ---------------------------------------------------------------------------
// The curated layout system. Documents reference these by id; rects are
// normalized to the spread (x/w over double-page width, y/h over page height).
//
// Conventions:
// - Slots are listed in reading order (left→right, top→bottom). remapSlots()
//   relies on this to preserve content across layout switches.
// - No photo or text slot crosses the gutter at x = 0.5 — only deliberate
//   full-spread bleeds do.
// - Framed layouts use a 10mm-equivalent margin on square formats:
//   0.025 of spread width, 0.05 of page height.
// ---------------------------------------------------------------------------

export const SPREAD_LAYOUTS: SpreadLayout[] = [
  // One photo bleeding across the entire spread — panoramas, hero moments.
  {
    id: "spread-full",
    slots: [{ x: 0, y: 0, w: 1, h: 1, type: "photo" }],
  },
  // One framed photo on the right page, left page intentionally blank —
  // the classic album opener, and the home for single portrait shots.
  {
    id: "spread-single",
    slots: [{ x: 0.525, y: 0.05, w: 0.45, h: 0.9, type: "photo" }],
  },
  // Two photos, each bleeding over a full page.
  {
    id: "spread-pages",
    slots: [
      { x: 0, y: 0, w: 0.5, h: 1, type: "photo" },
      { x: 0.5, y: 0, w: 0.5, h: 1, type: "photo" },
    ],
  },
  // Two framed photos, one per page.
  {
    id: "spread-duo",
    slots: [
      { x: 0.025, y: 0.05, w: 0.45, h: 0.9, type: "photo" },
      { x: 0.525, y: 0.05, w: 0.45, h: 0.9, type: "photo" },
    ],
  },
  // Full-bleed left page + one smaller framed photo centered on the right.
  {
    id: "spread-feature-right",
    slots: [
      { x: 0, y: 0, w: 0.5, h: 1, type: "photo" },
      { x: 0.6, y: 0.2, w: 0.3, h: 0.6, type: "photo" },
    ],
  },
  // Full-bleed left page + two stacked framed photos on the right.
  {
    id: "spread-trio-right",
    slots: [
      { x: 0, y: 0, w: 0.5, h: 1, type: "photo" },
      { x: 0.525, y: 0.05, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.525, y: 0.525, w: 0.45, h: 0.425, type: "photo" },
    ],
  },
  // Mirror: two stacked framed photos left, full-bleed right page.
  {
    id: "spread-trio-left",
    slots: [
      { x: 0.025, y: 0.05, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.025, y: 0.525, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.5, y: 0, w: 0.5, h: 1, type: "photo" },
    ],
  },
  // Four framed photos, a 2×2 grid per spread (one column per page).
  {
    id: "spread-quad",
    slots: [
      { x: 0.025, y: 0.05, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.525, y: 0.05, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.025, y: 0.525, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.525, y: 0.525, w: 0.45, h: 0.425, type: "photo" },
    ],
  },
  // Framed photo on the left, story text centered on the right page.
  {
    id: "spread-story",
    slots: [
      { x: 0.025, y: 0.05, w: 0.45, h: 0.9, type: "photo" },
      { x: 0.575, y: 0.38, w: 0.35, h: 0.24, type: "text" },
    ],
  },
  // Two stacked photos left; caption above a photo on the right page.
  {
    id: "spread-gallery-caption",
    slots: [
      { x: 0.025, y: 0.05, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.55, y: 0.08, w: 0.4, h: 0.14, type: "text" },
      { x: 0.025, y: 0.525, w: 0.45, h: 0.425, type: "photo" },
      { x: 0.525, y: 0.28, w: 0.45, h: 0.67, type: "photo" },
    ],
  },
  // Text only — dedications, chapter breaks. Centered on the right page.
  {
    id: "spread-text",
    slots: [{ x: 0.575, y: 0.38, w: 0.35, h: 0.24, type: "text" }],
  },
];

// Cover layouts — boxes normalized to the front cover page.
export const COVER_LAYOUTS: CoverLayout[] = [
  // Type-only cover on the chosen cover color.
  {
    id: "cover-classic",
    photoSlots: [],
    titleBox: { x: 0.1, y: 0.4, w: 0.8, h: 0.12 },
    subtitleBox: { x: 0.15, y: 0.54, w: 0.7, h: 0.08 },
  },
  // Full-bleed cover photo, title overlaid near the foot.
  {
    id: "cover-full",
    photoSlots: [{ x: 0, y: 0, w: 1, h: 1 }],
    titleBox: { x: 0.08, y: 0.74, w: 0.84, h: 0.12 },
    subtitleBox: { x: 0.08, y: 0.86, w: 0.84, h: 0.07 },
  },
  // Window-matted photo over the cover color, title beneath.
  {
    id: "cover-window",
    photoSlots: [{ x: 0.2, y: 0.16, w: 0.6, h: 0.45 }],
    titleBox: { x: 0.1, y: 0.68, w: 0.8, h: 0.1 },
    subtitleBox: { x: 0.15, y: 0.79, w: 0.7, h: 0.07 },
  },
  // Photo band across the middle, title above.
  {
    id: "cover-band",
    photoSlots: [{ x: 0, y: 0.3, w: 1, h: 0.4 }],
    titleBox: { x: 0.1, y: 0.12, w: 0.8, h: 0.11 },
    subtitleBox: { x: 0.15, y: 0.76, w: 0.7, h: 0.07 },
  },
  // Two photos side by side, title beneath.
  {
    id: "cover-duo",
    photoSlots: [
      { x: 0.12, y: 0.2, w: 0.36, h: 0.38 },
      { x: 0.52, y: 0.2, w: 0.36, h: 0.38 },
    ],
    titleBox: { x: 0.1, y: 0.66, w: 0.8, h: 0.1 },
    subtitleBox: { x: 0.15, y: 0.77, w: 0.7, h: 0.06 },
  },
  // One small centered photo, quiet type below.
  {
    id: "cover-minimal",
    photoSlots: [{ x: 0.36, y: 0.18, w: 0.28, h: 0.28 }],
    titleBox: { x: 0.1, y: 0.55, w: 0.8, h: 0.1 },
    subtitleBox: { x: 0.15, y: 0.66, w: 0.7, h: 0.06 },
  },
];

export const DEFAULT_SPREAD_LAYOUT_ID = "spread-duo";
export const DEFAULT_COVER_LAYOUT_ID = "cover-classic";

export function getSpreadLayout(id: string): SpreadLayout {
  const layout = SPREAD_LAYOUTS.find((l) => l.id === id);
  if (!layout) throw new Error(`Unknown spread layout: ${id}`);
  return layout;
}

export function getCoverLayout(id: string): CoverLayout {
  const layout = COVER_LAYOUTS.find((l) => l.id === id);
  if (!layout) throw new Error(`Unknown cover layout: ${id}`);
  return layout;
}

export function photoSlotCount(layout: SpreadLayout): number {
  return layout.slots.filter((s) => s.type === "photo").length;
}
