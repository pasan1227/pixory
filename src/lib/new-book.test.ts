import { describe, expect, it } from "vitest";

import { DEFAULT_SPREAD_LAYOUT_ID } from "@/data/layouts";
import { BOOK_FORMATS, bookDocumentSchema } from "@/lib/schemas/book";
import { createEmptyBookDocument } from "@/lib/new-book";
import { spreadBounds } from "@/lib/print-specs";

describe("createEmptyBookDocument", () => {
  it.each(BOOK_FORMATS)("builds a schema-valid %s document", (format) => {
    const document = createEmptyBookDocument(format);
    expect(() => bookDocumentSchema.parse(document)).not.toThrow();
    expect(document.format).toBe(format);
    expect(document.schemaVersion).toBe(2);
  });

  it.each(BOOK_FORMATS)(
    "starts %s at the minimum spread count, all slots empty",
    (format) => {
      const document = createEmptyBookDocument(format);
      expect(document.spreads).toHaveLength(spreadBounds(format).minSpreads);
      for (const spread of document.spreads) {
        expect(spread.slots.length).toBeGreaterThan(0);
        for (const slot of spread.slots) {
          expect(slot.kind).toBe("empty");
        }
      }
    },
  );

  it("gives spreads unique ids", () => {
    const { spreads } = createEmptyBookDocument("square_20");
    expect(new Set(spreads.map((s) => s.id)).size).toBe(spreads.length);
  });

  it("defaults every spread to the curated starting layout", () => {
    const { spreads } = createEmptyBookDocument("square_20");
    for (const spread of spreads) {
      expect(spread.layoutId).toBe(DEFAULT_SPREAD_LAYOUT_ID);
    }
  });
});
