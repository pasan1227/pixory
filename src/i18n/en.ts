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
  create: {
    title: "Start your book",
    subtitle: "Pick a format — you can add photos and change everything later.",
    cta: "Create this book",
  },
  editor: {
    untitled: "Untitled book",
  },
  tray: {
    title: "Your photos",
    empty: "No photos yet — add some to get started.",
    addPhotos: "Add photos",
    dropHint: "Drag photos here or tap to choose",
    uploading: "Uploading…",
    processing: "Preparing…",
    savingOriginal: "Saving full quality…",
    failed: "Upload failed",
    retry: "Retry",
    dismiss: "Dismiss",
    remove: "Remove",
    usedOnce: "Used once",
    usedTimes: "Used {count}×",
    errors: {
      not_found: "This book is no longer available.",
      invalid_input: "Something went wrong with this photo.",
      file_missing: "The file could not be read.",
      file_too_large: "This photo is too large to upload.",
      unsupported_type: "Only JPEG and PNG photos are supported.",
      heic_unsupported:
        "iPhone HEIC photos aren't supported yet — please convert to JPEG and try again.",
    },
  },
  pricing: {
    freeDelivery: "Free delivery",
    deliveryAtCheckout: "Delivery calculated at checkout",
  },
} as const;
