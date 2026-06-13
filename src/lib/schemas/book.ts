import { z } from "zod";

// ---------------------------------------------------------------------------
// BookDocument — the single source of truth for an entire book.
//
// All geometry is normalized: 0–1 floats relative to spread dimensions.
// Never pixels. Screen, thumbnails, admin preview and the 300 DPI print
// pipeline all render this same document.
//
// Any shape change here requires bumping CURRENT_SCHEMA_VERSION and adding a
// migration in src/lib/book-migrations.ts.
// ---------------------------------------------------------------------------

export const BOOK_FORMATS = ["square_20", "square_26", "landscape_a4"] as const;
export const bookFormatSchema = z.enum(BOOK_FORMATS);

// Curated in-book typography — the whole set. Display metadata lives in
// src/data/book-fonts.ts keyed by these ids. Widening this list is additive
// (existing documents keep their fontId); load the new face in the (editor)
// and create layouts, add BOOK_FONTS metadata and an en.fonts label.
export const BOOK_FONT_IDS = [
  "fraunces",
  "inter",
  "lora",
  "caveat",
  "playfair",
  "spaceGrotesk",
  "bebas",
  "pacifico",
] as const;
export const bookFontIdSchema = z.enum(BOOK_FONT_IDS);

// Curated cover colors — display metadata in src/data/cover-colors.ts.
// Widening this list is additive: existing documents reference existing ids and
// stay valid, so it needs no schemaVersion bump or migration. Keep the three
// derived maps in sync — COVER_COLORS, en.coverColors — or the build breaks.
export const COVER_COLOR_IDS = [
  "terracotta",
  "sage",
  "sand",
  "ink",
  "dusk",
  "ocean",
  "blush",
  "butter",
  "forest",
  "wine",
  "lavender",
  "mist",
  "gingham-sage",
  "gingham-blush",
  "stripe-ocean",
  "stripe-terracotta",
  "weave-forest",
  "weave-wine",
] as const;
export const coverColorIdSchema = z.enum(COVER_COLOR_IDS);

export const TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export const textAlignSchema = z.enum(TEXT_ALIGNMENTS);

// Whole-field text emphasis for cover title/subtitle. Each flag is independent;
// absent (undefined) means no emphasis at all.
export const coverTextStyleSchema = z.object({
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
});

// Zoom is a multiplier on top of cover-fit; 1 = photo exactly fills the slot.
export const MAX_CROP_SCALE = 3;

// crop.x / crop.y are the fraction of the available pan range consumed:
// 0 = flush left/top edge of the photo, 1 = flush right/bottom, 0.5 = centered.
// This keeps every {x, y} in [0,1] valid at any zoom level.
export const cropSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().min(1).max(MAX_CROP_SCALE),
});

export const photoPlacementSchema = z.object({
  kind: z.literal("photo"),
  photoId: z.string().min(1),
  crop: cropSchema,
});

export const textContentSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
  fontId: bookFontIdSchema,
  align: textAlignSchema,
});

export const emptySlotSchema = z.object({
  kind: z.literal("empty"),
});

// Slot contents align by index with the slot rects of the spread's layout
// (src/data/layouts.ts).
export const slotContentSchema = z.discriminatedUnion("kind", [
  photoPlacementSchema,
  textContentSchema,
  emptySlotSchema,
]);

export const spreadSchema = z.object({
  id: z.string().min(1),
  layoutId: z.string().min(1),
  slots: z.array(slotContentSchema),
});

// Cover photo slots align by index with the cover layout's photo slot rects;
// an unfilled slot is { kind: "empty" }.
export const coverSlotSchema = z.discriminatedUnion("kind", [
  photoPlacementSchema,
  emptySlotSchema,
]);

export const coverSchema = z.object({
  layoutId: z.string().min(1),
  title: z.string(),
  titleStyle: coverTextStyleSchema.optional(),
  subtitle: z.string().optional(),
  subtitleStyle: coverTextStyleSchema.optional(),
  spineText: z.string().optional(),
  colorId: coverColorIdSchema,
  fontId: bookFontIdSchema,
  photoSlots: z.array(coverSlotSchema),
});

export const bookDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  format: bookFormatSchema,
  cover: coverSchema,
  spreads: z.array(spreadSchema),
});
