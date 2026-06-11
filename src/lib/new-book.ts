import {
  DEFAULT_COVER_LAYOUT_ID,
  DEFAULT_SPREAD_LAYOUT_ID,
  getSpreadLayout,
} from "@/data/layouts";
import { spreadBounds } from "@/lib/print-specs";
import { CURRENT_SCHEMA_VERSION } from "@/lib/book-migrations";
import type { BookDocument, BookFormat, Spread } from "@/types/book";

// Fresh document for a newly created book: minimum spread count, all slots
// empty, classic type-only cover awaiting the cover step.
export function createEmptyBookDocument(format: BookFormat): BookDocument {
  const { minSpreads } = spreadBounds(format);
  const layout = getSpreadLayout(DEFAULT_SPREAD_LAYOUT_ID);
  const spreads: Spread[] = Array.from({ length: minSpreads }, (_, index) => ({
    id: `spread-${index + 1}`,
    layoutId: layout.id,
    slots: layout.slots.map(() => ({ kind: "empty" })),
  }));
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    format,
    cover: {
      layoutId: DEFAULT_COVER_LAYOUT_ID,
      title: "",
      colorId: "terracotta",
      fontId: "fraunces",
      photoSlots: [],
    },
    spreads,
  };
}
