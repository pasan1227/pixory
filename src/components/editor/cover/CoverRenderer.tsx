"use client";

import { CoverPhotoSlot } from "@/components/editor/cover/CoverPhotoSlot";
import { CoverTextLayer } from "@/components/editor/cover/CoverTitle";
import { SpineStrip } from "@/components/editor/cover/SpineStrip";
import { BOOK_FONTS } from "@/data/book-fonts";
import { COVER_COLORS } from "@/data/cover-colors";
import { getCoverLayout } from "@/data/layouts";
import { PAGES_PER_SPREAD, PRINT_SPECS } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { CSSProperties } from "react";
import type { BookDocument, CoverSlot } from "@/types/book";

// ---------------------------------------------------------------------------
// The ONE cover renderer. Editor canvas (interactive), filmstrip thumbnail,
// /create live preview and my-books (read-only) all render the same
// normalized document through this component — interactive only when
// callbacks are passed. Cover rects are PAGE-normalized; all geometry is
// percentages of the front cover box. Cover-color hexes are book content and
// flow through inline style by design.
// ---------------------------------------------------------------------------

type CoverRendererProps = Readonly<{
  document: BookDocument;
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
  showSpine?: boolean;
  showBadges?: boolean;
  className?: string;
  style?: CSSProperties;
}>;

// Stable fallback so memoized slots don't re-render when the cover has fewer
// contents than its layout has rects (transient mid-edit state).
const EMPTY_SLOT: CoverSlot = { kind: "empty" };

export function CoverRenderer({
  document,
  photosById,
  selectedSlotIndex,
  onSlotClick,
  onSlotPan,
  onSlotPanStart,
  onSlotPanEnd,
  showSpine = false,
  showBadges = false,
  className,
  style,
}: CoverRendererProps) {
  const spec = PRINT_SPECS[document.format];
  const { cover } = document;
  const layout = getCoverLayout(cover.layoutId);
  const color = COVER_COLORS[cover.colorId];
  const font = BOOK_FONTS[cover.fontId];
  const fontFamily = `var(${font.cssVariable}, ${font.fallback})`;
  const interactive = onSlotClick !== undefined;

  const pageCount = document.spreads.length * PAGES_PER_SPREAD;
  const spineVisible = showSpine && pageCount > spec.spineTextMinPages;

  return (
    <div className={`flex w-full ${className ?? ""}`} style={style}>
      {spineVisible && (
        <SpineStrip
          text={cover.spineText || cover.title}
          bgHex={color.hex}
          textHex={color.textHex}
          fontFamily={fontFamily}
        />
      )}
      <div
        className={`relative min-w-0 flex-1 overflow-hidden shadow ${
          spineVisible ? "rounded-r-sm" : "rounded-sm"
        }`}
        // container-type: size exposes cqh units so cover text scales with
        // the rendered cover (canvas, thumbnail, preview), not fixed pixels.
        style={{
          aspectRatio: spec.pageWidthMm / spec.pageHeightMm,
          backgroundColor: color.hex,
          // A patterned cover paints its CSS layers over the base colour.
          ...color.pattern,
          containerType: "size",
        }}
      >
        {layout.photoSlots.map((rect, index) => {
          const content = cover.photoSlots[index] ?? EMPTY_SLOT;
          return (
            <CoverPhotoSlot
              // Cover slot contents align with layout rects by index — the
              // index is the slot's identity on the cover.
              key={index}
              spec={spec}
              rect={rect}
              content={content}
              slotIndex={index}
              photo={content.kind === "photo" ? photosById[content.photoId] : undefined}
              selected={selectedSlotIndex === index}
              showBadges={showBadges}
              textHex={color.textHex}
              onSlotClick={onSlotClick}
              onSlotPan={onSlotPan}
              onSlotPanStart={onSlotPanStart}
              onSlotPanEnd={onSlotPanEnd}
            />
          );
        })}
        <CoverTextLayer
          cover={cover}
          layout={layout}
          interactive={interactive}
          colorHex={color.textHex}
          fontFamily={fontFamily}
        />
      </div>
    </div>
  );
}
