import { describe, expect, it } from "vitest";

import { COVER_COLORS } from "@/data/cover-colors";
import { en } from "@/i18n/en";
import { COVER_COLOR_IDS } from "@/lib/schemas/book";

// The cover-colour id list, its metadata map, and its labels must stay in sync —
// TS only enforces the metadata map, so this guards the label + hex shapes.
const HEX = /^#[0-9A-Fa-f]{6}$/;
const labels: Record<string, string> = en.coverColors;

describe("cover colours", () => {
  it.each(COVER_COLOR_IDS)("%s has valid metadata and a label", (id) => {
    const color = COVER_COLORS[id];
    expect(color.id).toBe(id);
    expect(color.hex).toMatch(HEX);
    expect(color.textHex).toMatch(HEX);
    expect(labels[id]).toBeTruthy();
  });

  it("only patterned ids carry a CSS pattern", () => {
    for (const id of COVER_COLOR_IDS) {
      const isPatterned = /^(gingham|stripe|weave)-/.test(id);
      expect(Boolean(COVER_COLORS[id].pattern)).toBe(isPatterned);
    }
  });
});
