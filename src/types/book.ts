import type { z } from "zod";
import type {
  bookDocumentSchema,
  bookFontIdSchema,
  bookFormatSchema,
  coverColorIdSchema,
  coverSchema,
  coverSlotSchema,
  cropSchema,
  emptySlotSchema,
  photoPlacementSchema,
  slotContentSchema,
  spreadSchema,
  textAlignSchema,
  textContentSchema,
} from "@/lib/schemas/book";

// All book document types are inferred from the Zod schemas in
// src/lib/schemas/book.ts — the schemas are the source of truth.

export type BookFormat = z.infer<typeof bookFormatSchema>;
export type BookFontId = z.infer<typeof bookFontIdSchema>;
export type CoverColorId = z.infer<typeof coverColorIdSchema>;
export type TextAlign = z.infer<typeof textAlignSchema>;
export type Crop = z.infer<typeof cropSchema>;
export type PhotoPlacement = z.infer<typeof photoPlacementSchema>;
export type TextContent = z.infer<typeof textContentSchema>;
export type EmptySlot = z.infer<typeof emptySlotSchema>;
export type SlotContent = z.infer<typeof slotContentSchema>;
export type CoverSlot = z.infer<typeof coverSlotSchema>;
export type Spread = z.infer<typeof spreadSchema>;
export type BookCover = z.infer<typeof coverSchema>;
export type BookDocument = z.infer<typeof bookDocumentSchema>;
