import type {
  PhotoPlacement,
  SlotContent,
  Spread,
  TextContent,
} from "@/types/book";
import type { SpreadLayout } from "@/types/layout";

// ---------------------------------------------------------------------------
// Content-preserving layout switching.
//
// Layout slots are listed in reading order (src/data/layouts.ts), and a
// spread's slot contents align by index with its layout's slots. Switching
// layouts must never silently drop a customer's photo: content that doesn't
// fit the new layout overflows back to the tray, in order.
// ---------------------------------------------------------------------------

export interface RemapResult {
  spread: Spread;
  overflowPhotos: PhotoPlacement[];
  overflowTexts: TextContent[];
}

// Spread-clones (not field lists) so additive schema changes survive remapping;
// crop is the only nested object in either shape.
function clonePhoto(placement: PhotoPlacement): PhotoPlacement {
  return { ...placement, crop: { ...placement.crop } };
}

function cloneText(content: TextContent): TextContent {
  return { ...content };
}

// Remap a spread's contents onto a new layout. Photos fill the new layout's
// photo slots in order, texts fill its text slots in order; whatever remains
// overflows (never dropped). Pure: the input spread is not mutated, and the
// result shares no mutable objects with it.
export function remapSlots(
  spread: Spread,
  newLayout: SpreadLayout,
): RemapResult {
  const photos = spread.slots
    .filter((slot): slot is PhotoPlacement => slot.kind === "photo")
    .map(clonePhoto);
  const texts = spread.slots
    .filter((slot): slot is TextContent => slot.kind === "text")
    .map(cloneText);

  let nextPhoto = 0;
  let nextText = 0;
  const slots: SlotContent[] = newLayout.slots.map((slotDef) => {
    if (slotDef.type === "photo" && nextPhoto < photos.length) {
      const placement = photos[nextPhoto];
      nextPhoto += 1;
      return placement;
    }
    if (slotDef.type === "text" && nextText < texts.length) {
      const content = texts[nextText];
      nextText += 1;
      return content;
    }
    return { kind: "empty" };
  });

  return {
    spread: { id: spread.id, layoutId: newLayout.id, slots },
    overflowPhotos: photos.slice(nextPhoto),
    overflowTexts: texts.slice(nextText),
  };
}
