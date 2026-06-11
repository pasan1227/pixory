import { produce } from "immer";
import { getSpreadLayout } from "@/data/layouts";
import { DEFAULT_CROP, clampCrop } from "@/lib/crop";
import { spreadBounds } from "@/lib/print-specs";
import { remapSlots } from "@/lib/remap-slots";
import type {
  BookDocument,
  BookFontId,
  Crop,
  TextAlign,
} from "@/types/book";

// ---------------------------------------------------------------------------
// Pure document operations — every editor mutation funnels through these.
// Each returns a new document (structural sharing via immer) and is a no-op
// (returning the SAME reference) when the operation is invalid or would
// violate format bounds. The editor store and undo history both rely on that
// reference discipline: no change → same object → no history entry.
// ---------------------------------------------------------------------------

function hasSlot(
  doc: BookDocument,
  spreadIndex: number,
  slotIndex: number,
): boolean {
  const spread = doc.spreads[spreadIndex];
  return spread !== undefined && slotIndex >= 0 && slotIndex < spread.slots.length;
}

// Place a photo into a slot with a fresh centered crop. Placing the photo
// that is already there keeps its crop (no-op).
export function placePhoto(
  doc: BookDocument,
  spreadIndex: number,
  slotIndex: number,
  photoId: string,
): BookDocument {
  if (!hasSlot(doc, spreadIndex, slotIndex)) return doc;
  const current = doc.spreads[spreadIndex].slots[slotIndex];
  if (current.kind === "photo" && current.photoId === photoId) return doc;
  return produce(doc, (draft) => {
    draft.spreads[spreadIndex].slots[slotIndex] = {
      kind: "photo",
      photoId,
      crop: { ...DEFAULT_CROP },
    };
  });
}

export function setSlotCrop(
  doc: BookDocument,
  spreadIndex: number,
  slotIndex: number,
  crop: Crop,
): BookDocument {
  if (!hasSlot(doc, spreadIndex, slotIndex)) return doc;
  const slot = doc.spreads[spreadIndex].slots[slotIndex];
  if (slot.kind !== "photo") return doc;
  const next = clampCrop(crop);
  const same =
    slot.crop.x === next.x &&
    slot.crop.y === next.y &&
    slot.crop.scale === next.scale;
  if (same) return doc;
  return produce(doc, (draft) => {
    const target = draft.spreads[spreadIndex].slots[slotIndex];
    if (target.kind === "photo") target.crop = next;
  });
}

export function setSlotText(
  doc: BookDocument,
  spreadIndex: number,
  slotIndex: number,
  input: { text: string; fontId: BookFontId; align: TextAlign },
): BookDocument {
  if (!hasSlot(doc, spreadIndex, slotIndex)) return doc;
  const slot = doc.spreads[spreadIndex].slots[slotIndex];
  const same =
    slot.kind === "text" &&
    slot.text === input.text &&
    slot.fontId === input.fontId &&
    slot.align === input.align;
  if (same) return doc;
  return produce(doc, (draft) => {
    draft.spreads[spreadIndex].slots[slotIndex] = { kind: "text", ...input };
  });
}

export function clearSlot(
  doc: BookDocument,
  spreadIndex: number,
  slotIndex: number,
): BookDocument {
  if (!hasSlot(doc, spreadIndex, slotIndex)) return doc;
  if (doc.spreads[spreadIndex].slots[slotIndex].kind === "empty") return doc;
  return produce(doc, (draft) => {
    draft.spreads[spreadIndex].slots[slotIndex] = { kind: "empty" };
  });
}

// Switch a spread's layout, preserving content via remapSlots. Photos that
// no longer fit drop out of the document — usage counts derive from the
// document, so they reappear in the tray automatically.
export function switchSpreadLayout(
  doc: BookDocument,
  spreadIndex: number,
  layoutId: string,
): BookDocument {
  const spread = doc.spreads[spreadIndex];
  if (!spread || spread.layoutId === layoutId) return doc;
  const layout = getSpreadLayout(layoutId);
  const { spread: remapped } = remapSlots(spread, layout);
  return produce(doc, (draft) => {
    draft.spreads[spreadIndex] = remapped;
  });
}

// Insert an empty default-layout spread after the given index (-1 prepends).
// No-op at the format's max page count. The caller supplies the id so the
// operation stays pure and deterministic under test.
export function addSpreadAfter(
  doc: BookDocument,
  afterIndex: number,
  newSpreadId: string,
): BookDocument {
  const { maxSpreads } = spreadBounds(doc.format);
  if (doc.spreads.length >= maxSpreads) return doc;
  if (afterIndex < -1 || afterIndex >= doc.spreads.length) return doc;
  if (doc.spreads.some((s) => s.id === newSpreadId)) return doc;
  const layout = getSpreadLayout("spread-duo");
  return produce(doc, (draft) => {
    draft.spreads.splice(afterIndex + 1, 0, {
      id: newSpreadId,
      layoutId: layout.id,
      slots: layout.slots.map(() => ({ kind: "empty" })),
    });
  });
}

// Remove a spread. No-op at the format's min page count.
export function removeSpread(
  doc: BookDocument,
  spreadIndex: number,
): BookDocument {
  const { minSpreads } = spreadBounds(doc.format);
  if (doc.spreads.length <= minSpreads) return doc;
  if (spreadIndex < 0 || spreadIndex >= doc.spreads.length) return doc;
  return produce(doc, (draft) => {
    draft.spreads.splice(spreadIndex, 1);
  });
}

// Replace the whole spread list (auto-create). One history entry; fully
// undoable. Bounds are the caller's contract (distributePhotos respects
// format min/max); an empty list is rejected as a no-op.
export function replaceSpreads(
  doc: BookDocument,
  spreads: BookDocument["spreads"],
): BookDocument {
  if (spreads.length === 0 || spreads === doc.spreads) return doc;
  return produce(doc, (draft) => {
    draft.spreads = spreads;
  });
}

export function moveSpread(
  doc: BookDocument,
  fromIndex: number,
  toIndex: number,
): BookDocument {
  const count = doc.spreads.length;
  const valid =
    fromIndex >= 0 && fromIndex < count && toIndex >= 0 && toIndex < count;
  if (!valid || fromIndex === toIndex) return doc;
  return produce(doc, (draft) => {
    const [moved] = draft.spreads.splice(fromIndex, 1);
    draft.spreads.splice(toIndex, 0, moved);
  });
}
