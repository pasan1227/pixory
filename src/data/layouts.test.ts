import { describe, expect, it } from "vitest";

import { COVER_LAYOUTS, SPREAD_LAYOUTS } from "@/data/layouts";
import { en } from "@/i18n/en";
import type { CoverBox } from "@/types/layout";

const EPS = 1e-9;
const coverLabels: Record<string, string> = en.coverLayouts;
const spreadLabels: Record<string, string> = en.layouts;

// A box stays inside the normalized 0–1 cover/spread surface and has area.
function expectValidBox(box: CoverBox, where: string) {
  expect(box.w, `${where} width`).toBeGreaterThan(0);
  expect(box.h, `${where} height`).toBeGreaterThan(0);
  expect(box.x, `${where} x`).toBeGreaterThanOrEqual(0);
  expect(box.y, `${where} y`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.w, `${where} right edge`).toBeLessThanOrEqual(1 + EPS);
  expect(box.y + box.h, `${where} bottom edge`).toBeLessThanOrEqual(1 + EPS);
}

describe("COVER_LAYOUTS", () => {
  it("has unique ids", () => {
    const ids = COVER_LAYOUTS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(COVER_LAYOUTS)("$id keeps every box inside the cover", (layout) => {
    layout.photoSlots.forEach((box, index) =>
      expectValidBox(box, `${layout.id} photoSlot ${index}`),
    );
    expectValidBox(layout.titleBox, `${layout.id} titleBox`);
    if (layout.subtitleBox) {
      expectValidBox(layout.subtitleBox, `${layout.id} subtitleBox`);
    }
  });

  it.each(COVER_LAYOUTS)("$id has an en.coverLayouts label", (layout) => {
    expect(coverLabels[layout.id]).toBeTruthy();
  });
});

describe("SPREAD_LAYOUTS", () => {
  it.each(SPREAD_LAYOUTS)("$id has an en.layouts label", (layout) => {
    expect(spreadLabels[layout.id]).toBeTruthy();
  });
});
