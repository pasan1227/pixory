"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import { DpiBadge } from "@/components/editor/spread/DpiBadge";
import { en } from "@/i18n/en";
import { cropToCssPercent } from "@/lib/crop";
import { dpiStatus, effectiveDpi } from "@/lib/dpi";
import type { PrintSpec } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { CoverSlot, PhotoPlacement } from "@/types/book";
import type { CoverBox } from "@/types/layout";

// What shows inside one cover photo slot: the placed photo (with DPI badge),
// a quiet placeholder while the referenced photo is missing, or the empty
// state. Cover rects are PAGE-normalized, so the slot's physical size is
// rect × page trim — slotPhysicalSizeMm() (spread-normalized) must NOT be
// used here.

type CoverSlotContentProps = Readonly<{
  spec: PrintSpec;
  rect: CoverBox;
  content: CoverSlot;
  photo?: PhotoDto;
  showBadge: boolean;
  // Add-photo affordance only on interactive surfaces (editor canvas).
  affordance: boolean;
  // Cover stock foreground — keeps the empty state readable on any color.
  textHex: string;
}>;

function CoverPhoto({
  spec,
  rect,
  placement,
  photo,
  showBadge,
}: Readonly<{
  spec: PrintSpec;
  rect: CoverBox;
  placement: PhotoPlacement;
  photo: PhotoDto;
  showBadge: boolean;
}>) {
  const dims = { width: photo.width, height: photo.height };
  const physical = {
    widthMm: rect.w * spec.pageWidthMm,
    heightMm: rect.h * spec.pageHeightMm,
  };
  const css = cropToCssPercent(
    dims,
    physical.widthMm / physical.heightMm,
    placement.crop,
  );
  const status = dpiStatus(effectiveDpi(dims, physical, placement.crop));
  return (
    <>
      {/* `unoptimized`: the storage route is session-cookie-authenticated, so
          the Next image optimizer can never retrieve it. width/height satisfy
          next/image; the style percentages override them for
          resolution-independent layout. */}
      <Image
        src={photo.previewUrl}
        alt={photo.fileName}
        width={photo.width}
        height={photo.height}
        unoptimized
        draggable={false}
        className="absolute select-none"
        style={{
          width: `${css.widthPct}%`,
          height: `${css.heightPct}%`,
          left: `${css.leftPct}%`,
          top: `${css.topPct}%`,
          maxWidth: "none",
        }}
      />
      {showBadge && status !== "ok" && <DpiBadge status={status} />}
    </>
  );
}

function CoverSlotContentImpl({
  spec,
  rect,
  content,
  photo,
  showBadge,
  affordance,
  textHex,
}: CoverSlotContentProps) {
  if (content.kind === "photo") {
    if (!photo) {
      // Referenced photo still uploading or deleted — hold its place quietly.
      return <div className="absolute inset-0 bg-ink/10" />;
    }
    return (
      <CoverPhoto
        spec={spec}
        rect={rect}
        placement={content}
        photo={photo}
        showBadge={showBadge}
      />
    );
  }
  if (!affordance) {
    // Read-only empty slot (thumbnails, previews): a quiet tinted block.
    return (
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `${textHex}1A` }}
      />
    );
  }
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-1 border border-dashed"
      // ~50% alpha keeps the dashed affordance visible on any cover color.
      style={{ borderColor: `${textHex}80`, color: textHex }}
    >
      <Plus size={16} aria-hidden="true" />
      <span className="text-xs">{en.editor.slot.addPhoto}</span>
    </div>
  );
}

export const CoverSlotContent = memo(CoverSlotContentImpl);
