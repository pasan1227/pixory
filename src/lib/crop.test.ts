import { describe, expect, it } from "vitest";
import {
  DEFAULT_CROP,
  clampCrop,
  cropToCss,
  panCropByPixels,
  visibleRect,
  zoomCrop,
} from "@/lib/crop";
import type { PhotoRegion, Size } from "@/lib/crop";
import { slotAspectRatio } from "@/lib/print-specs";
import { BOOK_FORMATS, MAX_CROP_SCALE, cropSchema } from "@/lib/schemas/book";
import { SPREAD_LAYOUTS } from "@/data/layouts";
import type { Crop } from "@/types/book";

const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Shared grids for property-style invariants. All values are fixed constants —
// no randomness — so failures are reproducible.
// ---------------------------------------------------------------------------

// Real-world photo shapes: landscape, portrait, square, panorama, tall crop.
const PHOTO_SIZES: Size[] = [
  { width: 4000, height: 3000 },
  { width: 3000, height: 4000 },
  { width: 1000, height: 1000 },
  { width: 6000, height: 2000 },
  { width: 800, height: 2400 },
  { width: 5184, height: 3456 },
  { width: 1080, height: 1920 },
];

const SCALES = [1, 1.5, 2, MAX_CROP_SCALE];

const PAN_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 1],
  [0, 1],
  [1, 0],
  [0.5, 0.5],
  [0.2, 0.8],
];

// Every distinct physical slot aspect ratio produced by the real layout
// catalogue across all print formats — the aspects visibleRect() actually
// sees in production.
function collectSlotAspects(): number[] {
  const seen = new Set<number>();
  for (const format of BOOK_FORMATS) {
    for (const layout of SPREAD_LAYOUTS) {
      for (const slot of layout.slots) {
        if (slot.type !== "photo") continue;
        seen.add(slotAspectRatio(format, slot));
      }
    }
  }
  return [...seen];
}

const SLOT_ASPECTS = collectSlotAspects();

function forEachCrop(fn: (crop: Crop) => void): void {
  for (const scale of SCALES) {
    for (const [x, y] of PAN_PAIRS) {
      fn({ x, y, scale });
    }
  }
}

function physicalAspect(v: PhotoRegion, photo: Size): number {
  return (v.w * photo.width) / (v.h * photo.height);
}

// ---------------------------------------------------------------------------
// DEFAULT_CROP
// ---------------------------------------------------------------------------

describe("DEFAULT_CROP", () => {
  it("is the centered, unzoomed crop", () => {
    expect(DEFAULT_CROP).toEqual({ x: 0.5, y: 0.5, scale: 1 });
  });

  it("parses against cropSchema unchanged", () => {
    const parsed = cropSchema.parse(DEFAULT_CROP);
    expect(parsed).toEqual(DEFAULT_CROP);
  });

  it("is a fixed point of clampCrop", () => {
    expect(clampCrop(DEFAULT_CROP)).toEqual(DEFAULT_CROP);
  });
});

// ---------------------------------------------------------------------------
// clampCrop
// ---------------------------------------------------------------------------

describe("clampCrop", () => {
  it("returns in-range crops unchanged", () => {
    const crop: Crop = { x: 0.25, y: 0.75, scale: 2 };
    expect(clampCrop(crop)).toEqual(crop);
  });

  it("keeps the boundary values 0/1 and 1/MAX_CROP_SCALE", () => {
    expect(clampCrop({ x: 0, y: 1, scale: 1 })).toEqual({ x: 0, y: 1, scale: 1 });
    expect(clampCrop({ x: 1, y: 0, scale: MAX_CROP_SCALE })).toEqual({
      x: 1,
      y: 0,
      scale: MAX_CROP_SCALE,
    });
  });

  it("clamps scale below 1 up to 1", () => {
    expect(clampCrop({ x: 0.5, y: 0.5, scale: 0.5 }).scale).toBe(1);
    expect(clampCrop({ x: 0.5, y: 0.5, scale: 0 }).scale).toBe(1);
  });

  it("clamps scale above MAX_CROP_SCALE down to it", () => {
    expect(clampCrop({ x: 0.5, y: 0.5, scale: 5 }).scale).toBe(MAX_CROP_SCALE);
  });

  it("clamps x and y into [0, 1]", () => {
    expect(clampCrop({ x: -1, y: 2, scale: 1 })).toEqual({ x: 0, y: 1, scale: 1 });
    expect(clampCrop({ x: 1.0001, y: -0.0001, scale: 1 })).toEqual({
      x: 1,
      y: 0,
      scale: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// visibleRect — hand-computed cases
// ---------------------------------------------------------------------------

describe("visibleRect: hand-computed cases", () => {
  it("photo wider than slot: full height shows, width is cropped", () => {
    // Photo aspect 2 in a square slot: cover fit spans the photo's height
    // (h = 1) and shows slotAspect/photoAspect = 1/2 of its width.
    const v = visibleRect({ width: 2000, height: 1000 }, 1, DEFAULT_CROP);
    expect(v.w).toBeCloseTo(0.5, 12);
    expect(v.h).toBeCloseTo(1, 12);
    expect(v.x).toBeCloseTo(0.25, 12); // centered: (1 - 0.5) / 2
    expect(v.y).toBeCloseTo(0, 12);
  });

  it("photo taller than slot: full width shows, height is cropped", () => {
    // Photo aspect 0.5 in a 1.5 slot: w = 1, h = 0.5 / 1.5 = 1/3.
    const v = visibleRect({ width: 1000, height: 2000 }, 1.5, DEFAULT_CROP);
    expect(v.w).toBeCloseTo(1, 12);
    expect(v.h).toBeCloseTo(1 / 3, 12);
    expect(v.x).toBeCloseTo(0, 12);
    expect(v.y).toBeCloseTo(1 / 3, 12); // centered: (1 - 1/3) / 2
  });

  it("aspect match: w = h = 1/scale, positioned per x and y", () => {
    const photo: Size = { width: 1500, height: 1000 }; // aspect 1.5
    const v = visibleRect(photo, 1.5, { x: 0.25, y: 0.75, scale: 2 });
    expect(v.w).toBeCloseTo(0.5, 12);
    expect(v.h).toBeCloseTo(0.5, 12);
    expect(v.x).toBeCloseTo(0.25 * (1 - 0.5), 12); // 0.125
    expect(v.y).toBeCloseTo(0.75 * (1 - 0.5), 12); // 0.375
  });

  it("aspect match at scale 1 shows the entire photo", () => {
    const v = visibleRect({ width: 1200, height: 800 }, 1.5, DEFAULT_CROP);
    expect(v).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("scale 1 centered: equal margins on the cropped axis", () => {
    for (const photo of PHOTO_SIZES) {
      for (const slotAspect of SLOT_ASPECTS) {
        const v = visibleRect(photo, slotAspect, DEFAULT_CROP);
        // Left margin equals right margin, top margin equals bottom margin.
        expect(Math.abs(v.x - (1 - (v.x + v.w)))).toBeLessThanOrEqual(EPS);
        expect(Math.abs(v.y - (1 - (v.y + v.h)))).toBeLessThanOrEqual(EPS);
      }
    }
  });

  it("x = 0 is flush left, x = 1 is flush right (and same for y)", () => {
    const photo: Size = { width: 6000, height: 2000 };
    const flushLeft = visibleRect(photo, 1, { x: 0, y: 0, scale: 2 });
    expect(flushLeft.x).toBe(0);
    expect(flushLeft.y).toBe(0);

    const flushRight = visibleRect(photo, 1, { x: 1, y: 1, scale: 2 });
    expect(Math.abs(flushRight.x + flushRight.w - 1)).toBeLessThanOrEqual(EPS);
    expect(Math.abs(flushRight.y + flushRight.h - 1)).toBeLessThanOrEqual(EPS);
  });

  it("scale 2 halves both w and h relative to scale 1", () => {
    const cases: Array<{ photo: Size; slotAspect: number }> = [
      { photo: { width: 2000, height: 1000 }, slotAspect: 1 }, // wider
      { photo: { width: 1000, height: 2000 }, slotAspect: 1.5 }, // taller
      { photo: { width: 1500, height: 1000 }, slotAspect: 1.5 }, // exact match
    ];
    for (const { photo, slotAspect } of cases) {
      const at1 = visibleRect(photo, slotAspect, { x: 0.5, y: 0.5, scale: 1 });
      const at2 = visibleRect(photo, slotAspect, { x: 0.5, y: 0.5, scale: 2 });
      expect(at2.w).toBeCloseTo(at1.w / 2, 12);
      expect(at2.h).toBeCloseTo(at1.h / 2, 12);
    }
  });
});

describe("visibleRect: clamps out-of-range crop inputs", () => {
  const photo: Size = { width: 2000, height: 1000 };

  it("scale 0.5 behaves exactly like scale 1", () => {
    const loose = visibleRect(photo, 1, { x: 0.3, y: 0.7, scale: 0.5 });
    const clamped = visibleRect(photo, 1, { x: 0.3, y: 0.7, scale: 1 });
    expect(loose).toEqual(clamped);
  });

  it("scale 5 behaves exactly like scale 3", () => {
    const loose = visibleRect(photo, 1, { x: 0.3, y: 0.7, scale: 5 });
    const clamped = visibleRect(photo, 1, { x: 0.3, y: 0.7, scale: MAX_CROP_SCALE });
    expect(loose).toEqual(clamped);
  });

  it("x = -1 behaves exactly like x = 0; y = 2 like y = 1", () => {
    const loose = visibleRect(photo, 1, { x: -1, y: 2, scale: 2 });
    const clamped = visibleRect(photo, 1, { x: 0, y: 1, scale: 2 });
    expect(loose).toEqual(clamped);
  });
});

describe("visibleRect: invariants over photo/slot/crop grid", () => {
  it("visible region stays inside [0,1]^2 with positive size", () => {
    for (const photo of PHOTO_SIZES) {
      for (const slotAspect of SLOT_ASPECTS) {
        forEachCrop((crop) => {
          const v = visibleRect(photo, slotAspect, crop);
          expect(v.w).toBeGreaterThan(0);
          expect(v.h).toBeGreaterThan(0);
          expect(v.x).toBeGreaterThanOrEqual(0);
          expect(v.y).toBeGreaterThanOrEqual(0);
          expect(v.x + v.w).toBeLessThanOrEqual(1 + EPS);
          expect(v.y + v.h).toBeLessThanOrEqual(1 + EPS);
        });
      }
    }
  });

  it("physical aspect of the visible region always equals the slot aspect", () => {
    for (const photo of PHOTO_SIZES) {
      for (const slotAspect of SLOT_ASPECTS) {
        forEachCrop((crop) => {
          const v = visibleRect(photo, slotAspect, crop);
          const diff = Math.abs(physicalAspect(v, photo) - slotAspect);
          expect(diff).toBeLessThanOrEqual(EPS);
        });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// cropToCss
// ---------------------------------------------------------------------------

describe("cropToCss", () => {
  const SLOT_PX_SIZES: Size[] = [
    { width: 360, height: 240 },
    { width: 240, height: 360 },
    { width: 97, height: 131 }, // odd sizes to shake out integer assumptions
    { width: 1024, height: 1024 },
  ];

  it("hand-computed: wide photo in a square slot, centered, scale 1", () => {
    const css = cropToCss(
      { width: 2000, height: 1000 },
      { width: 100, height: 100 },
      DEFAULT_CROP,
    );
    expect(css.width).toBeCloseTo(200, 9);
    expect(css.height).toBeCloseTo(100, 9);
    expect(css.left).toBeCloseTo(-50, 9);
    expect(css.top).toBeCloseTo(0, 9);
  });

  it("rendered img aspect always equals the photo aspect (never distorts)", () => {
    for (const photo of PHOTO_SIZES) {
      for (const slotPx of SLOT_PX_SIZES) {
        forEachCrop((crop) => {
          const css = cropToCss(photo, slotPx, crop);
          const imgAspect = css.width / css.height;
          const photoAspect = photo.width / photo.height;
          expect(Math.abs(imgAspect - photoAspect)).toBeLessThanOrEqual(
            photoAspect * 1e-9,
          );
        });
      }
    }
  });

  it("x = 0 pins the photo's left edge to the slot's left edge", () => {
    const css = cropToCss(
      { width: 6000, height: 2000 },
      { width: 300, height: 200 },
      { x: 0, y: 0.5, scale: 1 },
    );
    // Math.abs folds the IEEE -0 produced by `-0 * width` into +0; the
    // contract is numeric equality with zero, which -0 satisfies.
    expect(Math.abs(css.left)).toBe(0);
  });

  it("x = 1 pins the photo's right edge to the slot's right edge", () => {
    const slotPx: Size = { width: 300, height: 200 };
    const css = cropToCss(
      { width: 6000, height: 2000 },
      slotPx,
      { x: 1, y: 0.5, scale: 1 },
    );
    expect(Math.abs(css.left + css.width - slotPx.width)).toBeLessThanOrEqual(1e-6);
  });

  it("y = 0 and y = 1 pin the photo's top/bottom edges to the slot", () => {
    const photo: Size = { width: 1000, height: 4000 };
    const slotPx: Size = { width: 300, height: 200 };
    const top = cropToCss(photo, slotPx, { x: 0.5, y: 0, scale: 1 });
    expect(Math.abs(top.top)).toBe(0);
    const bottom = cropToCss(photo, slotPx, { x: 0.5, y: 1, scale: 1 });
    expect(Math.abs(bottom.top + bottom.height - slotPx.height)).toBeLessThanOrEqual(
      1e-6,
    );
  });

  it("img always covers the slot completely", () => {
    for (const photo of PHOTO_SIZES) {
      for (const slotPx of SLOT_PX_SIZES) {
        forEachCrop((crop) => {
          const css = cropToCss(photo, slotPx, crop);
          expect(css.left).toBeLessThanOrEqual(0);
          expect(css.top).toBeLessThanOrEqual(0);
          expect(css.left + css.width).toBeGreaterThanOrEqual(slotPx.width - 1e-6);
          expect(css.top + css.height).toBeGreaterThanOrEqual(slotPx.height - 1e-6);
        });
      }
    }
  });

  it("img is never smaller than the slot on either axis", () => {
    for (const photo of PHOTO_SIZES) {
      for (const slotPx of SLOT_PX_SIZES) {
        const css = cropToCss(photo, slotPx, DEFAULT_CROP);
        expect(css.width).toBeGreaterThanOrEqual(slotPx.width - 1e-6);
        expect(css.height).toBeGreaterThanOrEqual(slotPx.height - 1e-6);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// panCropByPixels
// ---------------------------------------------------------------------------

describe("panCropByPixels", () => {
  // Photo aspect 2 in a 100x100 slot at scale 1: img renders 200x100, so the
  // horizontal pan range is exactly 100px and there is no vertical range.
  const photo: Size = { width: 2000, height: 1000 };
  const slotPx: Size = { width: 100, height: 100 };

  it("dragging left by the full pan range moves x from flush-left to flush-right", () => {
    const out = panCropByPixels(photo, slotPx, { x: 0, y: 0.5, scale: 1 }, -100, 0);
    expect(out.x).toBeCloseTo(1, 12);
    expect(out.y).toBe(0.5);
    expect(out.scale).toBe(1);
  });

  it("dragging right by the full pan range moves x from flush-right to flush-left", () => {
    const out = panCropByPixels(photo, slotPx, { x: 1, y: 0.5, scale: 1 }, 100, 0);
    expect(out.x).toBeCloseTo(0, 12);
  });

  it("positive dx decreases crop.x (dragging photo right reveals its left side)", () => {
    const out = panCropByPixels(photo, slotPx, { x: 0.5, y: 0.5, scale: 1 }, 25, 0);
    expect(out.x).toBeCloseTo(0.25, 12);
  });

  it("negative dx increases crop.x", () => {
    const out = panCropByPixels(photo, slotPx, { x: 0.5, y: 0.5, scale: 1 }, -25, 0);
    expect(out.x).toBeCloseTo(0.75, 12);
  });

  it("an axis with no pan range is unchanged regardless of the drag", () => {
    // At scale 1 the photo exactly fits the slot height: rangeY = 0.
    const out = panCropByPixels(photo, slotPx, { x: 0.5, y: 0.5, scale: 1 }, 0, 9999);
    expect(out.y).toBe(0.5);
  });

  it("a photo that exactly fits the slot ignores drags on both axes", () => {
    const fit = panCropByPixels(
      { width: 3000, height: 2000 },
      { width: 300, height: 200 },
      { x: 0.3, y: 0.7, scale: 1 },
      500,
      -500,
    );
    expect(fit).toEqual({ x: 0.3, y: 0.7, scale: 1 });
  });

  it("hand-computed two-axis pan at scale 2", () => {
    // Square photo, square slot, scale 2: img is 200x200, range 100 each way.
    const out = panCropByPixels(
      { width: 1000, height: 1000 },
      { width: 100, height: 100 },
      { x: 0.5, y: 0.5, scale: 2 },
      50,
      -50,
    );
    expect(out.x).toBeCloseTo(0, 12); // 0.5 - 50/100
    expect(out.y).toBeCloseTo(1, 12); // 0.5 + 50/100
    expect(out.scale).toBe(2);
  });

  it("clamps the result to [0, 1] on oversized drags", () => {
    const far = panCropByPixels(photo, slotPx, { x: 0.5, y: 0.5, scale: 1 }, 1e6, 0);
    expect(far.x).toBe(0);
    const other = panCropByPixels(photo, slotPx, { x: 0.5, y: 0.5, scale: 1 }, -1e6, 0);
    expect(other.x).toBe(1);
  });

  it("always returns a schema-valid crop and preserves scale (grid)", () => {
    const drags: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [37, -53],
      [-500, 500],
      [1e6, 1e6],
    ];
    for (const p of PHOTO_SIZES) {
      for (const [dx, dy] of drags) {
        forEachCrop((crop) => {
          const out = panCropByPixels(p, { width: 240, height: 180 }, crop, dx, dy);
          expect(() => cropSchema.parse(out)).not.toThrow();
          expect(out.scale).toBe(crop.scale);
        });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// zoomCrop
// ---------------------------------------------------------------------------

describe("zoomCrop", () => {
  it("sets an in-range scale and preserves x/y exactly", () => {
    const out = zoomCrop({ x: 0.3, y: 0.8, scale: 1 }, 2.5);
    expect(out).toEqual({ x: 0.3, y: 0.8, scale: 2.5 });
  });

  it("clamps scale below 1 up to 1", () => {
    expect(zoomCrop({ x: 0.3, y: 0.8, scale: 2 }, 0.5)).toEqual({
      x: 0.3,
      y: 0.8,
      scale: 1,
    });
  });

  it("clamps scale above MAX_CROP_SCALE down to it", () => {
    expect(zoomCrop({ x: 0.3, y: 0.8, scale: 2 }, 10)).toEqual({
      x: 0.3,
      y: 0.8,
      scale: MAX_CROP_SCALE,
    });
  });

  it("passes the boundary scales 1 and MAX_CROP_SCALE through unchanged", () => {
    expect(zoomCrop(DEFAULT_CROP, 1).scale).toBe(1);
    expect(zoomCrop(DEFAULT_CROP, MAX_CROP_SCALE).scale).toBe(MAX_CROP_SCALE);
  });

  it("is the identity on x/y for every pan position (pan-fraction model)", () => {
    forEachCrop((crop) => {
      const out = zoomCrop(crop, 1.7);
      expect(out.x).toBe(crop.x);
      expect(out.y).toBe(crop.y);
      expect(out.scale).toBe(1.7);
    });
  });
});
