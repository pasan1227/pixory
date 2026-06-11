"use client";

import { en } from "@/i18n/en";
import { zoomCrop } from "@/lib/crop";
import { slotDpiStatus, type DpiStatus } from "@/lib/dpi";
import { MAX_CROP_SCALE } from "@/lib/schemas/book";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookFormat, Crop, PhotoPlacement } from "@/types/book";
import type { SlotDef } from "@/types/layout";

type PhotoPanelProps = Readonly<{
  format: BookFormat;
  layoutSlot: SlotDef;
  // Null when a photo-type slot is selected but still empty.
  placement: PhotoPlacement | null;
  photo: PhotoDto | undefined;
  onCropChange: (crop: Crop) => void;
  onReplace: () => void;
  onRemove: () => void;
}>;

const ACTION_BUTTON_CLASS =
  "min-h-11 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta";

function DpiNotice({ status }: Readonly<{ status: DpiStatus }>) {
  if (status === "ok") return null;
  const blocked = status === "blocked";
  return (
    <p
      role="status"
      className={`text-xs font-medium ${
        blocked ? "text-terracotta-deep" : "text-terracotta"
      }`}
    >
      {blocked ? en.dpi.blocked : en.dpi.warning}
    </p>
  );
}

export function PhotoPanel({
  format,
  layoutSlot,
  placement,
  photo,
  onCropChange,
  onReplace,
  onRemove,
}: PhotoPanelProps) {
  if (placement === null) {
    return (
      <button
        type="button"
        onClick={onReplace}
        className="rounded-md bg-terracotta px-3 py-2 text-sm font-semibold text-paper transition-colors hover:bg-terracotta-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
      >
        {en.editor.slot.addPhoto}
      </button>
    );
  }

  const dpi = photo
    ? slotDpiStatus(
        { width: photo.width, height: photo.height },
        format,
        layoutSlot,
        placement.crop,
      )
    : null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        {en.editor.panel.zoom}
        <input
          type="range"
          min={1}
          max={MAX_CROP_SCALE}
          step={0.01}
          value={placement.crop.scale}
          onChange={(event) =>
            onCropChange(zoomCrop(placement.crop, Number(event.target.value)))
          }
          className="w-full accent-terracotta"
        />
      </label>
      {dpi && <DpiNotice status={dpi.status} />}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReplace}
          className={`${ACTION_BUTTON_CLASS} text-ink`}
        >
          {en.editor.panel.replace}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className={`${ACTION_BUTTON_CLASS} text-terracotta-deep`}
        >
          {en.editor.panel.remove}
        </button>
      </div>
    </div>
  );
}
