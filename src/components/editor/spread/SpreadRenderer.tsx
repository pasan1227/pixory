"use client";

import { SpreadSlot } from "@/components/editor/spread/SpreadSlot";
import { getSpreadLayout } from "@/data/layouts";
import { spreadAspectRatio } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookFormat, SlotContent, Spread } from "@/types/book";

// ---------------------------------------------------------------------------
// The ONE spread renderer. Editor canvas (interactive), filmstrip thumbnails
// (read-only), preview and admin all render the same normalized document
// through this component — interactive only when callbacks are passed.
// All geometry is percentages of the spread box; pixels exist transiently
// inside the pan handler only.
// ---------------------------------------------------------------------------

type SpreadRendererProps = Readonly<{
  format: BookFormat;
  spread: Spread;
  photosById: Record<string, PhotoDto>;
  selectedSlotIndex?: number | null;
  onSlotClick?: (slotIndex: number) => void;
  onSlotPan?: (
    slotIndex: number,
    dxPx: number,
    dyPx: number,
    slotPx: { width: number; height: number },
  ) => void;
  onSlotPanStart?: (slotIndex: number) => void;
  onSlotPanEnd?: (slotIndex: number) => void;
  showBadges?: boolean;
  className?: string;
}>;

// Stable fallback so memoized slots don't re-render when a spread has fewer
// contents than its layout has rects (transient mid-edit state).
const EMPTY_CONTENT: SlotContent = { kind: "empty" };

export function SpreadRenderer({
  format,
  spread,
  photosById,
  selectedSlotIndex,
  onSlotClick,
  onSlotPan,
  onSlotPanStart,
  onSlotPanEnd,
  showBadges = false,
  className,
}: SpreadRendererProps) {
  const layout = getSpreadLayout(spread.layoutId);
  return (
    <div
      className={`relative w-full overflow-hidden bg-white shadow ${className ?? ""}`}
      // container-type: size exposes cqh units so slot text scales with the
      // rendered spread (canvas, thumbnail, preview) instead of fixed pixels.
      style={{ aspectRatio: spreadAspectRatio(format), containerType: "size" }}
    >
      {/* Page gutter — rendered first so slot content paints over it. */}
      <div aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-zinc-200" />
      {layout.slots.map((rect, index) => {
        const content = spread.slots[index] ?? EMPTY_CONTENT;
        const photo: PhotoDto | undefined =
          content.kind === "photo" ? photosById[content.photoId] : undefined;
        return (
          <SpreadSlot
            // Slot contents align with layout rects by index — the index is
            // the slot's identity within a spread.
            key={index}
            format={format}
            rect={rect}
            content={content}
            slotIndex={index}
            photo={photo}
            selected={selectedSlotIndex === index}
            showBadges={showBadges}
            onSlotClick={onSlotClick}
            onSlotPan={onSlotPan}
            onSlotPanStart={onSlotPanStart}
            onSlotPanEnd={onSlotPanEnd}
          />
        );
      })}
    </div>
  );
}
