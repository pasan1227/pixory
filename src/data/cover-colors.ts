import type { CoverColorId } from "@/types/book";

// The 8 curated cover colors. Ids are fixed in src/lib/schemas/book.ts
// (COVER_COLOR_IDS). Hex values here are book *content* (printed cover stock),
// not UI chrome — the no-raw-hex-in-components rule does not apply to data.
export interface CoverColor {
  id: CoverColorId;
  hex: string;
  // Foreground for title text on this cover color.
  textHex: string;
}

export const COVER_COLORS: Record<CoverColorId, CoverColor> = {
  terracotta: { id: "terracotta", hex: "#C2654B", textHex: "#FAF7F2" },
  sage: { id: "sage", hex: "#8A9B7E", textHex: "#FAF7F2" },
  sand: { id: "sand", hex: "#EDE6DB", textHex: "#1C1917" },
  ink: { id: "ink", hex: "#1C1917", textHex: "#FAF7F2" },
  dusk: { id: "dusk", hex: "#5C5470", textHex: "#FAF7F2" },
  ocean: { id: "ocean", hex: "#3D5A6C", textHex: "#FAF7F2" },
  blush: { id: "blush", hex: "#D8A7A0", textHex: "#1C1917" },
  butter: { id: "butter", hex: "#E8C97E", textHex: "#1C1917" },
};
