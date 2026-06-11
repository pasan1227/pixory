"use client";

import Image from "next/image";
import { memo } from "react";
import { DpiBadge } from "@/components/editor/spread/DpiBadge";
import { cropToCssPercent } from "@/lib/crop";
import { slotDpiStatus } from "@/lib/dpi";
import { slotAspectRatio } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookFormat, PhotoPlacement } from "@/types/book";
import type { SlotDef } from "@/types/layout";

// A photo placed in a slot: the image is positioned entirely in percentages
// of the slot box (cropToCssPercent), so the same numbers render the canvas,
// thumbnails and any future preview at any size.

type PhotoSlotContentProps = Readonly<{
  format: BookFormat;
  rect: SlotDef;
  placement: PhotoPlacement;
  photo?: PhotoDto;
  showBadge: boolean;
}>;

function PhotoSlotContentImpl({
  format,
  rect,
  placement,
  photo,
  showBadge,
}: PhotoSlotContentProps) {
  if (!photo) {
    // Referenced photo still uploading or deleted — hold its place quietly.
    return <div className="absolute inset-0 bg-sand" />;
  }
  const dims = { width: photo.width, height: photo.height };
  const css = cropToCssPercent(dims, slotAspectRatio(format, rect), placement.crop);
  const { status } = slotDpiStatus(dims, format, rect, placement.crop);
  return (
    <>
      {/* `unoptimized`: the storage route is session-cookie-authenticated, so
          the Next image optimizer (a server-side fetch without the user's
          cookies) can never retrieve it. width/height satisfy next/image; the
          style percentages override them for resolution-independent layout. */}
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

export const PhotoSlotContent = memo(PhotoSlotContentImpl);
