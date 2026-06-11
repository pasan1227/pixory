import type { BookDocument } from "@/types/book";

// How many times each photo appears in the document (spread slots + cover).
// The tray's used-count badges and "returns to the tray" semantics both
// derive from this — there is no separate placement bookkeeping to drift.
export function countPhotoUsage(doc: BookDocument): Record<string, number> {
  const counts: Record<string, number> = {};
  const bump = (photoId: string) => {
    counts[photoId] = (counts[photoId] ?? 0) + 1;
  };
  for (const spread of doc.spreads) {
    for (const slot of spread.slots) {
      if (slot.kind === "photo") bump(slot.photoId);
    }
  }
  for (const slot of doc.cover.photoSlots) {
    if (slot.kind === "photo") bump(slot.photoId);
  }
  return counts;
}
