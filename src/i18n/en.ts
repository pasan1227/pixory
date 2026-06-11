import { BRAND_NAME } from "@/data/site";

// Every user-facing string — marketing AND editor — lives here. No string
// literals in JSX that a user will read. Sinhala/Tamil land as additive
// locale files with this same shape.
export const en = {
  brand: {
    name: BRAND_NAME,
    tagline: "Beautiful photobooks, printed in Colombo and delivered island-wide.",
  },
  meta: {
    defaultTitle: `${BRAND_NAME} — Photobooks printed in Sri Lanka`,
    defaultDescription:
      "Design a premium photobook online in minutes. Printed in Colombo, delivered island-wide in 4–6 days. Cash on delivery available.",
  },
  formats: {
    square_20: "Square 20×20 cm",
    square_26: "Square 26×26 cm",
    landscape_a4: "Landscape A4",
  },
  layouts: {
    "spread-full": "Full spread",
    "spread-single": "Single framed",
    "spread-pages": "Two full pages",
    "spread-duo": "Two framed",
    "spread-feature-right": "Feature + accent",
    "spread-trio-right": "Feature + pair",
    "spread-trio-left": "Pair + feature",
    "spread-quad": "Four grid",
    "spread-story": "Photo + story",
    "spread-gallery-caption": "Gallery + caption",
    "spread-text": "Text page",
  },
  coverLayouts: {
    "cover-classic": "Classic",
    "cover-full": "Full photo",
    "cover-window": "Window",
    "cover-band": "Band",
    "cover-duo": "Duo",
    "cover-minimal": "Minimal",
  },
  fonts: {
    fraunces: "Fraunces",
    inter: "Inter",
    lora: "Lora",
    caveat: "Caveat",
  },
  coverColors: {
    terracotta: "Terracotta",
    sage: "Sage",
    sand: "Sand",
    ink: "Ink",
    dusk: "Dusk",
    ocean: "Ocean",
    blush: "Blush",
    butter: "Butter",
  },
  dpi: {
    warning: "May print blurry",
    blocked: "Too low resolution to print",
  },
  pricing: {
    freeDelivery: "Free delivery",
    deliveryAtCheckout: "Delivery calculated at checkout",
  },
} as const;
