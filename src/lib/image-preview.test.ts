import { describe, expect, it } from "vitest";

import {
  PREVIEW_JPEG_QUALITY,
  PREVIEW_MAX_DIMENSION,
  fitWithin,
} from "@/lib/image-preview";

// generatePreview() is browser-only (createImageBitmap + canvas) and is
// deliberately not tested here — these tests run in a node environment and
// cover only the pure geometry.

describe("constants", () => {
  it("match the preview pipeline contract", () => {
    expect(PREVIEW_MAX_DIMENSION).toBe(1600);
    expect(PREVIEW_JPEG_QUALITY).toBe(0.82);
  });
});

describe("fitWithin", () => {
  it("returns dimensions unchanged when both are below the limit", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1, 1, 1600)).toEqual({ width: 1, height: 1 });
    expect(fitWithin(1599, 1234, 1600)).toEqual({ width: 1599, height: 1234 });
  });

  it("returns dimensions unchanged when the longer side is exactly at the limit", () => {
    expect(fitWithin(1600, 1200, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1200, 1600, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("handles the width === height === maxDimension edge unchanged", () => {
    expect(fitWithin(1600, 1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it("downscales landscape so the width hits the limit exactly", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("downscales portrait so the height hits the limit exactly", () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it("downscales oversized squares to maxDimension on both sides", () => {
    expect(fitWithin(5000, 5000, 1600)).toEqual({ width: 1600, height: 1600 });
  });

  it("keeps extreme aspect ratios proportional", () => {
    // 100 * (1600 / 10000) = 16 exactly.
    expect(fitWithin(10000, 100, 1600)).toEqual({ width: 1600, height: 16 });
    expect(fitWithin(100, 10000, 1600)).toEqual({ width: 16, height: 1600 });
  });

  it("rounds the shorter side to the nearest pixel", () => {
    // 2000 * (1600 / 3001) = 1066.311... → 1066 (rounds down).
    expect(fitWithin(3001, 2000, 1600)).toEqual({ width: 1600, height: 1066 });
    // 2999 * (1600 / 4000) = 1199.6 → 1200 (rounds up).
    expect(fitWithin(4000, 2999, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it("clamps the shorter side to a 1px floor", () => {
    // 1 * (1600 / 100000) = 0.016 → rounds to 0 → clamped to 1.
    expect(fitWithin(100000, 1, 1600)).toEqual({ width: 1600, height: 1 });
    expect(fitWithin(1, 100000, 1600)).toEqual({ width: 1, height: 1600 });
  });

  it("respects an arbitrary maxDimension argument", () => {
    expect(fitWithin(4000, 3000, 1000)).toEqual({ width: 1000, height: 750 });
    expect(fitWithin(10, 5, 4)).toEqual({ width: 4, height: 2 });
    expect(fitWithin(3, 2, 4)).toEqual({ width: 3, height: 2 });
  });

  it("preserves aspect ratio within rounding across a grid of sizes", () => {
    const sizes = [100, 900, 1599, 1600, 1601, 2048, 3001, 4000, 5333, 9999];
    for (const width of sizes) {
      for (const height of sizes) {
        const out = fitWithin(width, height, PREVIEW_MAX_DIMENSION);
        if (width <= PREVIEW_MAX_DIMENSION && height <= PREVIEW_MAX_DIMENSION) {
          expect(out).toEqual({ width, height });
          continue;
        }
        const scale = PREVIEW_MAX_DIMENSION / Math.max(width, height);
        // Longer side lands exactly on the limit; nothing exceeds it.
        expect(Math.max(out.width, out.height)).toBe(PREVIEW_MAX_DIMENSION);
        expect(Math.min(out.width, out.height)).toBeGreaterThanOrEqual(1);
        // Orientation is preserved.
        expect(out.width >= out.height).toBe(width >= height);
        // Each side is within half a pixel of the exact scaled value.
        expect(Math.abs(out.width - width * scale)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(out.height - height * scale)).toBeLessThanOrEqual(0.5);
      }
    }
  });
});
