import type { BookFontId } from "@/types/book";

// The curated in-book typography set. The ids are fixed in
// src/lib/schemas/book.ts (BOOK_FONT_IDS); this maps them to display metadata.
// The actual font files load only in editor/preview routes (next/font there),
// exposing the CSS variables referenced here — marketing pages never pay for them.
export interface BookFont {
  id: BookFontId;
  cssVariable: string;
  fallback: string;
}

export const BOOK_FONTS: Record<BookFontId, BookFont> = {
  fraunces: {
    id: "fraunces",
    cssVariable: "--font-book-fraunces",
    fallback: "Georgia, serif",
  },
  inter: {
    id: "inter",
    cssVariable: "--font-book-inter",
    fallback: "system-ui, sans-serif",
  },
  lora: {
    id: "lora",
    cssVariable: "--font-book-lora",
    fallback: "Georgia, serif",
  },
  caveat: {
    id: "caveat",
    cssVariable: "--font-book-caveat",
    fallback: "cursive",
  },
};
