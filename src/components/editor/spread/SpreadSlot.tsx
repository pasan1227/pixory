"use client";

import { memo, type KeyboardEvent } from "react";
import { EmptySlotContent } from "@/components/editor/spread/EmptySlotContent";
import { PhotoSlotContent } from "@/components/editor/spread/PhotoSlotContent";
import { TextSlotContent } from "@/components/editor/spread/TextSlotContent";
import { useSlotPan } from "@/components/editor/spread/useSlotPan";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookFormat, SlotContent } from "@/types/book";
import type { SlotDef } from "@/types/layout";

// One absolutely-positioned slot of a spread: positioning, selection ring,
// click/keyboard activation and drag-to-pan live here; what shows inside is
// delegated to the per-kind content components.

type SpreadSlotProps = Readonly<{
  format: BookFormat;
  rect: SlotDef;
  content: SlotContent;
  slotIndex: number;
  photo?: PhotoDto;
  selected: boolean;
  showBadges: boolean;
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

function slotLabel(rect: SlotDef, slotIndex: number): string {
  const template =
    rect.type === "photo" ? en.editor.slot.photoLabel : en.editor.slot.textLabel;
  return template.replace("{n}", String(slotIndex + 1));
}

function cursorClass(interactive: boolean, panEnabled: boolean, panning: boolean): string {
  // touch-action: none while pannable so touch drags pan instead of scrolling.
  if (panEnabled) return panning ? "cursor-grabbing touch-none" : "cursor-grab touch-none";
  return interactive ? "cursor-pointer" : "";
}

function SlotBody({
  format,
  rect,
  content,
  photo,
  showBadge,
  affordance,
}: Readonly<{
  format: BookFormat;
  rect: SlotDef;
  content: SlotContent;
  photo?: PhotoDto;
  showBadge: boolean;
  affordance: boolean;
}>) {
  if (content.kind === "photo") {
    return (
      <PhotoSlotContent
        format={format}
        rect={rect}
        placement={content}
        photo={photo}
        showBadge={showBadge}
      />
    );
  }
  if (content.kind === "text" && content.text !== "") {
    return <TextSlotContent rect={rect} content={content} />;
  }
  // Empty slot — or text content not yet written, which reads as "add text".
  const slotType = content.kind === "text" ? "text" : rect.type;
  return <EmptySlotContent slotType={slotType} interactive={affordance} />;
}

function SpreadSlotImpl(props: SpreadSlotProps) {
  const { format, rect, content, slotIndex, photo, selected, showBadges } = props;
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
    <SlotBody
      format={format}
      rect={rect}
      content={content}
      photo={photo}
      showBadge={showBadges}
      affordance={interactive && showBadges}
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
      aria-label={slotLabel(rect, slotIndex)}
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

export const SpreadSlot = memo(SpreadSlotImpl);
