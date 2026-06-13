import type { CSSProperties } from "react";
import type { CoverColorId } from "@/types/book";

// The curated cover backgrounds. Ids are fixed in src/lib/schemas/book.ts
// (COVER_COLOR_IDS). Hex values here are book *content* (printed cover stock),
// not UI chrome — the no-raw-hex-in-components rule does not apply to data.
export interface CoverColor {
  id: CoverColorId;
  // Base/solid colour: the spine, the print fallback, and the surface a pattern
  // sits on.
  hex: string;
  // Foreground for title text on this cover.
  textHex: string;
  // Optional patterned finish. CSS background layers painted over `hex`. Sizes
  // are percentage-relative so the pattern looks identical on a 32px swatch and
  // a full cover, and the same component renders it everywhere (incl. print).
  pattern?: CSSProperties;
}

// Warm off-white used for gingham/weave highlights (matches the light textHex).
const PAPER = "250,247,242";

// Classic gingham: two perpendicular sets of semi-opaque lines over the base.
function gingham(): CSSProperties {
  const line = `rgba(${PAPER},0.5)`;
  const clear = `rgba(${PAPER},0)`;
  return {
    backgroundImage:
      `repeating-linear-gradient(90deg, ${line} 0 8.333%, ${clear} 8.333% 16.666%),` +
      `repeating-linear-gradient(0deg, ${line} 0 8.333%, ${clear} 8.333% 16.666%)`,
  };
}

// Tonal vertical stripes between two close shades.
function stripes(stripeHex: string, baseHex: string): CSSProperties {
  return {
    backgroundImage: `repeating-linear-gradient(90deg, ${stripeHex} 0 8.333%, ${baseHex} 8.333% 16.666%)`,
  };
}

// Subtle diagonal weave — a knit-like texture from crossed light/dark threads.
function weave(): CSSProperties {
  return {
    backgroundImage:
      `repeating-linear-gradient(45deg, rgba(${PAPER},0.1) 0 6.25%, rgba(${PAPER},0) 6.25% 12.5%),` +
      `repeating-linear-gradient(-45deg, rgba(0,0,0,0.14) 0 6.25%, rgba(0,0,0,0) 6.25% 12.5%)`,
  };
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
  forest: { id: "forest", hex: "#33503B", textHex: "#FAF7F2" },
  wine: { id: "wine", hex: "#6E2F3C", textHex: "#FAF7F2" },
  lavender: { id: "lavender", hex: "#9A8CB5", textHex: "#FAF7F2" },
  mist: { id: "mist", hex: "#C4D2D6", textHex: "#1C1917" },
  // Patterned finishes.
  "gingham-sage": {
    id: "gingham-sage",
    hex: "#8A9B7E",
    textHex: "#1C1917",
    pattern: gingham(),
  },
  "gingham-blush": {
    id: "gingham-blush",
    hex: "#D8A7A0",
    textHex: "#1C1917",
    pattern: gingham(),
  },
  "stripe-ocean": {
    id: "stripe-ocean",
    hex: "#3D5A6C",
    textHex: "#FAF7F2",
    pattern: stripes("#31495A", "#3D5A6C"),
  },
  "stripe-terracotta": {
    id: "stripe-terracotta",
    hex: "#C2654B",
    textHex: "#FAF7F2",
    pattern: stripes("#A9543D", "#C2654B"),
  },
  "weave-forest": {
    id: "weave-forest",
    hex: "#33503B",
    textHex: "#FAF7F2",
    pattern: weave(),
  },
  "weave-wine": {
    id: "weave-wine",
    hex: "#6E2F3C",
    textHex: "#FAF7F2",
    pattern: weave(),
  },
};
