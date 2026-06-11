import { produce } from "immer";
import { getCoverLayout } from "@/data/layouts";
import { DEFAULT_CROP, clampCrop } from "@/lib/crop";
import type { BookCover, BookDocument, CoverSlot, Crop } from "@/types/book";

// ---------------------------------------------------------------------------
// Pure cover operations — same discipline as document-ops: new document on
// change, SAME reference when the operation is invalid or a no-op. The cover
// participates in the one document undo history.
// ---------------------------------------------------------------------------

export type CoverStylePatch = Partial<
  Pick<BookCover, "title" | "subtitle" | "spineText" | "colorId" | "fontId">
>;

const STYLE_KEYS = [
  "title",
  "subtitle",
  "spineText",
  "colorId",
  "fontId",
] as const;

export function updateCoverStyle(
  doc: BookDocument,
  patch: CoverStylePatch,
): BookDocument {
  const changed = STYLE_KEYS.some(
    (key) => key in patch && patch[key] !== doc.cover[key],
  );
  if (!changed) return doc;
  return produce(doc, (draft) => {
    Object.assign(draft.cover, patch);
  });
}

// Switch the cover layout, preserving placed photos in order. The photoSlots
// array is resized to the new layout's photo slot count: extra photos drop
// out of the document (they return to the tray via usage counts), missing
// entries become empty.
export function switchCoverLayout(
  doc: BookDocument,
  layoutId: string,
): BookDocument {
  if (doc.cover.layoutId === layoutId) return doc;
  const layout = getCoverLayout(layoutId);
  const photos = doc.cover.photoSlots.filter(
    (slot): slot is Extract<CoverSlot, { kind: "photo" }> =>
      slot.kind === "photo",
  );
  const slots: CoverSlot[] = layout.photoSlots.map((_, index) => {
    const photo = photos[index];
    return photo
      ? { ...photo, crop: { ...photo.crop } }
      : { kind: "empty" as const };
  });
  return produce(doc, (draft) => {
    draft.cover.layoutId = layout.id;
    draft.cover.photoSlots = slots;
  });
}

function hasCoverSlot(doc: BookDocument, slotIndex: number): boolean {
  const layout = getCoverLayout(doc.cover.layoutId);
  return slotIndex >= 0 && slotIndex < layout.photoSlots.length;
}

// Ensure photoSlots is index-aligned with the layout before writing into it
// (documents created before a layout gained slots may have a short array).
function alignedSlots(doc: BookDocument): CoverSlot[] {
  const layout = getCoverLayout(doc.cover.layoutId);
  return layout.photoSlots.map(
    (_, index) => doc.cover.photoSlots[index] ?? { kind: "empty" as const },
  );
}

export function placeCoverPhoto(
  doc: BookDocument,
  slotIndex: number,
  photoId: string,
): BookDocument {
  if (!hasCoverSlot(doc, slotIndex)) return doc;
  const current = doc.cover.photoSlots[slotIndex];
  if (current?.kind === "photo" && current.photoId === photoId) return doc;
  return produce(doc, (draft) => {
    const slots = alignedSlots(doc);
    slots[slotIndex] = { kind: "photo", photoId, crop: { ...DEFAULT_CROP } };
    draft.cover.photoSlots = slots;
  });
}

export function setCoverCrop(
  doc: BookDocument,
  slotIndex: number,
  crop: Crop,
): BookDocument {
  if (!hasCoverSlot(doc, slotIndex)) return doc;
  const slot = doc.cover.photoSlots[slotIndex];
  if (slot?.kind !== "photo") return doc;
  const next = clampCrop(crop);
  const same =
    slot.crop.x === next.x &&
    slot.crop.y === next.y &&
    slot.crop.scale === next.scale;
  if (same) return doc;
  return produce(doc, (draft) => {
    const target = draft.cover.photoSlots[slotIndex];
    if (target?.kind === "photo") target.crop = next;
  });
}

export function clearCoverSlot(
  doc: BookDocument,
  slotIndex: number,
): BookDocument {
  if (!hasCoverSlot(doc, slotIndex)) return doc;
  if (doc.cover.photoSlots[slotIndex]?.kind !== "photo") return doc;
  return produce(doc, (draft) => {
    const slots = alignedSlots(doc);
    slots[slotIndex] = { kind: "empty" };
    draft.cover.photoSlots = slots;
  });
}
