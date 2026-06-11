import { describe, expect, it } from "vitest";

import { DEFAULT_CROP, visibleRect } from "@/lib/crop";
import {
  DPI_BLOCK_BELOW,
  DPI_WARN_BELOW,
  dpiStatus,
  effectiveDpi,
  mmToInches,
  slotDpiStatus,
} from "@/lib/dpi";
import { getSpreadLayout } from "@/data/layouts";
import type { Crop } from "@/types/book";

// Full-page slot on square_20: w 0.5 of the 400mm spread, h 1.0 of the
// 200mm page → 200mm × 200mm physical, aspect 1.
const FULL_PAGE_SQ20 = { widthMm: 200, heightMm: 200 };
const FULL_PAGE_SLOT = { w: 0.5, h: 1 };

const crop = (x: number, y: number, scale: number): Crop => ({ x, y, scale });

describe("constants", () => {
  it("match the CLAUDE.md DPI policy thresholds", () => {
    expect(DPI_BLOCK_BELOW).toBe(100);
    expect(DPI_WARN_BELOW).toBe(150);
  });
});

describe("mmToInches", () => {
  it("converts via 25.4 mm per inch", () => {
    expect(mmToInches(25.4)).toBe(1);
    expect(mmToInches(254)).toBe(10);
    expect(mmToInches(0)).toBe(0);
    expect(mmToInches(200)).toBeCloseTo(7.874015748, 9);
  });
});

describe("effectiveDpi", () => {
  it("3000x2000 photo in a 200x200mm slot at scale 1 → exactly 254 DPI", () => {
    // photoAspect 1.5 > slotAspect 1 → visible width fraction = 1/1.5.
    // Visible px = 3000 * (1/1.5) = 2000; 2000 / (200/25.4) = 254.
    const dpi = effectiveDpi(
      { width: 3000, height: 2000 },
      FULL_PAGE_SQ20,
      DEFAULT_CROP,
    );
    expect(dpi).toBeCloseTo(254, 9);
  });

  it("same placement at scale 2 → exactly 127 DPI", () => {
    const dpi = effectiveDpi(
      { width: 3000, height: 2000 },
      FULL_PAGE_SQ20,
      crop(0.5, 0.5, 2),
    );
    expect(dpi).toBeCloseTo(127, 9);
  });

  it("same placement at scale 2.6 → ≈97.69 DPI", () => {
    // 2000 / 2.6 = 769.2307... visible px; * 25.4 / 200 = 97.6923...
    const dpi = effectiveDpi(
      { width: 3000, height: 2000 },
      FULL_PAGE_SQ20,
      crop(0.5, 0.5, 2.6),
    );
    expect(dpi).toBeCloseTo(97.6923076923, 8);
  });

  it("portrait photo in a square slot: the narrow axis spans the slot", () => {
    // photoAspect 2/3 < slotAspect 1 → visible width fraction = 1.
    // Visible px = 2000; 2000 / (200/25.4) = 254.
    const dpi = effectiveDpi(
      { width: 2000, height: 3000 },
      FULL_PAGE_SQ20,
      DEFAULT_CROP,
    );
    expect(dpi).toBeCloseTo(254, 9);
  });

  it("width DPI equals height DPI by construction (visible aspect = slot aspect)", () => {
    const cases: Array<{
      photo: { width: number; height: number };
      slot: { widthMm: number; heightMm: number };
      c: Crop;
    }> = [
      { photo: { width: 3000, height: 2000 }, slot: FULL_PAGE_SQ20, c: DEFAULT_CROP },
      { photo: { width: 2000, height: 3000 }, slot: FULL_PAGE_SQ20, c: crop(0.2, 0.9, 1.7) },
      { photo: { width: 4000, height: 3000 }, slot: { widthMm: 594, heightMm: 210 }, c: crop(0, 1, 2.3) },
      { photo: { width: 1000, height: 1000 }, slot: { widthMm: 180, heightMm: 85 }, c: crop(1, 0, 3) },
    ];
    for (const { photo, slot, c } of cases) {
      const v = visibleRect(photo, slot.widthMm / slot.heightMm, c);
      const heightDpi = (photo.height * v.h) / mmToInches(slot.heightMm);
      expect(effectiveDpi(photo, slot, c)).toBeCloseTo(heightDpi, 9);
    }
  });

  it("panning (x/y) never changes DPI", () => {
    const baseline = effectiveDpi(
      { width: 3000, height: 2000 },
      FULL_PAGE_SQ20,
      crop(0.5, 0.5, 1.8),
    );
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      for (const y of [0, 0.5, 1]) {
        const dpi = effectiveDpi(
          { width: 3000, height: 2000 },
          FULL_PAGE_SQ20,
          crop(x, y, 1.8),
        );
        expect(dpi).toBeCloseTo(baseline, 12);
      }
    }
  });

  it("zooming in strictly decreases DPI", () => {
    const scales = [1, 1.2, 1.5, 2, 2.5, 3];
    const dpis = scales.map((scale) =>
      effectiveDpi(
        { width: 3000, height: 2000 },
        FULL_PAGE_SQ20,
        crop(0.5, 0.5, scale),
      ),
    );
    for (let i = 1; i < dpis.length; i += 1) {
      expect(dpis[i]).toBeLessThan(dpis[i - 1]);
    }
  });

  it("DPI is inversely proportional to scale", () => {
    const at1 = effectiveDpi(
      { width: 3000, height: 2000 },
      FULL_PAGE_SQ20,
      crop(0.5, 0.5, 1),
    );
    const at3 = effectiveDpi(
      { width: 3000, height: 2000 },
      FULL_PAGE_SQ20,
      crop(0.5, 0.5, 3),
    );
    expect(at3).toBeCloseTo(at1 / 3, 9);
  });

  it("out-of-range crop values are clamped (scale capped at 3, floored at 1)", () => {
    const photo = { width: 3000, height: 2000 };
    expect(effectiveDpi(photo, FULL_PAGE_SQ20, crop(0.5, 0.5, 5))).toBeCloseTo(
      effectiveDpi(photo, FULL_PAGE_SQ20, crop(0.5, 0.5, 3)),
      12,
    );
    expect(
      effectiveDpi(photo, FULL_PAGE_SQ20, crop(0.5, 0.5, 0.5)),
    ).toBeCloseTo(effectiveDpi(photo, FULL_PAGE_SQ20, crop(0.5, 0.5, 1)), 12);
  });
});

describe("dpiStatus", () => {
  it("blocks below 100", () => {
    expect(dpiStatus(0)).toBe("blocked");
    expect(dpiStatus(50.8)).toBe("blocked");
    expect(dpiStatus(99.999)).toBe("blocked");
  });

  it("warns from exactly 100 up to (not including) 150", () => {
    expect(dpiStatus(100)).toBe("warning");
    expect(dpiStatus(127)).toBe("warning");
    expect(dpiStatus(149.999)).toBe("warning");
  });

  it("is ok from exactly 150 up", () => {
    expect(dpiStatus(150)).toBe("ok");
    expect(dpiStatus(254)).toBe("ok");
    expect(dpiStatus(300)).toBe("ok");
  });
});

describe("slotDpiStatus", () => {
  it("3000x2000 in a square_20 full-page slot at scale 1 → 254 DPI, ok", () => {
    const { dpi, status } = slotDpiStatus(
      { width: 3000, height: 2000 },
      "square_20",
      FULL_PAGE_SLOT,
      DEFAULT_CROP,
    );
    expect(dpi).toBeCloseTo(254, 9);
    expect(status).toBe("ok");
  });

  it("same placement at scale 2 → 127 DPI, warning", () => {
    const { dpi, status } = slotDpiStatus(
      { width: 3000, height: 2000 },
      "square_20",
      FULL_PAGE_SLOT,
      crop(0.5, 0.5, 2),
    );
    expect(dpi).toBeCloseTo(127, 9);
    expect(status).toBe("warning");
  });

  it("same placement at scale 2.6 → ≈97.69 DPI, blocked", () => {
    const { dpi, status } = slotDpiStatus(
      { width: 3000, height: 2000 },
      "square_20",
      FULL_PAGE_SLOT,
      crop(0.5, 0.5, 2.6),
    );
    expect(dpi).toBeCloseTo(97.6923076923, 8);
    expect(status).toBe("blocked");
  });

  it("2000x1500 on a square_26 full page (260x260mm) → ≈146.5, warning", () => {
    // photoAspect 4/3 > slotAspect 1 → visible px = 2000 * 3/4 = 1500;
    // 1500 * 25.4 / 260 = 146.538...
    const { dpi, status } = slotDpiStatus(
      { width: 2000, height: 1500 },
      "square_26",
      { w: 0.5, h: 1 },
      DEFAULT_CROP,
    );
    expect(dpi).toBeCloseTo(146.5384615385, 8);
    expect(status).toBe("warning");
  });

  it("4000x3000 across a full landscape_a4 spread (594x210mm) → ≈171.0, ok", () => {
    // photoAspect 4/3 < slotAspect 594/210 → full width visible: 4000 px;
    // 4000 * 25.4 / 594 = 171.0437...
    const { dpi, status } = slotDpiStatus(
      { width: 4000, height: 3000 },
      "landscape_a4",
      { w: 1, h: 1 },
      DEFAULT_CROP,
    );
    expect(dpi).toBeCloseTo(171.0437710438, 8);
    expect(status).toBe("ok");
  });

  it("a tiny 600x400 photo on a square_20 full page → 50.8 DPI, blocked", () => {
    const { dpi, status } = slotDpiStatus(
      { width: 600, height: 400 },
      "square_20",
      FULL_PAGE_SLOT,
      DEFAULT_CROP,
    );
    expect(dpi).toBeCloseTo(50.8, 9);
    expect(status).toBe("blocked");
  });

  it("works with real layout slot rects (spread-quad on square_20)", () => {
    // Quad slot: w 0.45 * 400mm = 180mm, h 0.425 * 200mm = 85mm, aspect ≈ 2.118.
    // photoAspect 1.5 < slotAspect → full width visible: 3000 px;
    // 3000 * 25.4 / 180 = 423.33...
    const slot = getSpreadLayout("spread-quad").slots[0];
    const at1 = slotDpiStatus(
      { width: 3000, height: 2000 },
      "square_20",
      slot,
      DEFAULT_CROP,
    );
    expect(at1.dpi).toBeCloseTo(423.3333333333, 8);
    expect(at1.status).toBe("ok");

    const at3 = slotDpiStatus(
      { width: 3000, height: 2000 },
      "square_20",
      slot,
      crop(0.5, 0.5, 3),
    );
    expect(at3.dpi).toBeCloseTo(141.1111111111, 8);
    expect(at3.status).toBe("warning");
  });

  it("hits the policy boundaries exactly through the full pipeline", () => {
    // square_20 slot of w 0.127, h 0.254 → 50.8mm × 50.8mm = exactly 2in × 2in.
    const twoInchSlot = { w: 0.127, h: 0.254 };
    // 300px / 2in = 150 DPI → ok (boundary).
    expect(
      slotDpiStatus(
        { width: 300, height: 300 },
        "square_20",
        twoInchSlot,
        DEFAULT_CROP,
      ),
    ).toEqual({ dpi: 150, status: "ok" });
    // 200px / 2in = 100 DPI → warning (boundary).
    expect(
      slotDpiStatus(
        { width: 200, height: 200 },
        "square_20",
        twoInchSlot,
        DEFAULT_CROP,
      ),
    ).toEqual({ dpi: 100, status: "warning" });
    // 199px / 2in = 99.5 DPI → blocked.
    expect(
      slotDpiStatus(
        { width: 199, height: 199 },
        "square_20",
        twoInchSlot,
        DEFAULT_CROP,
      ),
    ).toEqual({ dpi: 99.5, status: "blocked" });
  });
});
