"use client";

import { memo, type KeyboardEvent } from "react";
import { CoverSlotContent } from "@/components/editor/cover/CoverSlotContent";
import { useSlotPan } from "@/components/editor/spread/useSlotPan";
import { en } from "@/i18n/en";
import type { PrintSpec } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { CoverSlot } from "@/types/book";
import type { CoverBox } from "@/types/layout";

// One absolutely-positioned photo slot on the front cover: positioning,
// selection ring, click/keyboard activation and drag-to-pan live here; what
// shows inside is delegated to CoverSlotContent. Mirrors SpreadSlot, but
// rects are PAGE-normalized (x/w over page width, y/h over page height).

type CoverPhotoSlotProps = Readonly<{
  spec: PrintSpec;
  rect: CoverBox;
  content: CoverSlot;
  slotIndex: number;
  photo?: PhotoDto;
  selected: boolean;
  showBadges: boolean;
  textHex: string;
  onSlotClick?: (slotIndex: number) => void;
  onSlotPan?: (
    slotIndex: number,
    dxPx: number,
    dyPx: number,
    slotPx: { width: number; height: number },
  ) => void;
  onSlotPanStart?: (slotIndex: number) => void;
  onSlotPanEnd?: (slotIndex: number) => void;
}>;

function cursorClass(interactive: boolean, panEnabled: boolean, panning: boolean): string {
  // touch-action: none while pannable so touch drags pan instead of scrolling.
  if (panEnabled) return panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none";
  return interactive ? "cursor-pointer" : "";
}

function CoverPhotoSlotImpl(props: CoverPhotoSlotProps) {
  const { spec, rect, content, slotIndex, photo, selected, showBadges, textHex } = props;
  const { onSlotClick, onSlotPan, onSlotPanStart, onSlotPanEnd } = props;
  const interactive = onSlotClick !== undefined;
  const panEnabled =
    onSlotPan !== undefined && selected && content.kind === "photo" && photo !== undefined;
  const { panning, handlers } = useSlotPan(
    panEnabled,
    (dx, dy, slotPx) => onSlotPan?.(slotIndex, dx, dy, slotPx),
    () => onSlotPanStart?.(slotIndex),
    () => onSlotPanEnd?.(slotIndex),
  );

  const style = {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.w * 100}%`,
    height: `${rect.h * 100}%`,
  };
  const className = [
    "group absolute overflow-hidden",
    selected ? "ring-2 ring-terracotta ring-inset" : "",
    cursorClass(interactive, panEnabled, panning),
    interactive
      ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-inset"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <CoverSlotContent
      spec={spec}
      rect={rect}
      content={content}
      photo={photo}
      showBadge={showBadges}
      affordance={interactive && showBadges}
      textHex={textHex}
    />
  );

  if (!interactive) {
    return (
      <div className={className} style={style}>
        {body}
      </div>
    );
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSlotClick(slotIndex);
  };
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={en.editor.slot.photoLabel.replace("{n}", String(slotIndex + 1))}
      className={className}
      style={style}
      onClick={() => onSlotClick(slotIndex)}
      onKeyDown={handleKeyDown}
      {...handlers}
    >
      {body}
    </div>
  );
}

export const CoverPhotoSlot = memo(CoverPhotoSlotImpl);
