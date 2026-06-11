"use client";

import type { PickTarget } from "@/components/editor/pick-target";
import { getCoverLayout } from "@/data/layouts";
import { en } from "@/i18n/en";
import { zoomCrop } from "@/lib/crop";
import { dpiStatus, effectiveDpi, type DpiStatus } from "@/lib/dpi";
import { PRINT_SPECS } from "@/lib/print-specs";
import { MAX_CROP_SCALE } from "@/lib/schemas/book";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore } from "@/stores/editor-store";
import type { BookFormat, CoverSlot, Crop } from "@/types/book";
import type { CoverBox } from "@/types/layout";

type CoverPhotoControlsProps = Readonly<{
  slotIndex: number;
  photosById: Record<string, PhotoDto>;
  onRequestPhotoPick: (target: PickTarget) => void;
}>;

const ACTION_BUTTON_CLASS =
  "min-h-11 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta";

// DPI for a cover photo slot. Cover rects are normalized to the FRONT COVER
// PAGE (x/w over page width, y/h over page height) — slotPhysicalSizeMm() is
// for spread-normalized rects and must not be used here.
function coverSlotDpi(
  format: BookFormat,
  layoutId: string,
  slotIndex: number,
  photo: PhotoDto | undefined,
  crop: Crop,
): DpiStatus | null {
  if (!photo) return null;
  const rect: CoverBox | undefined =
    getCoverLayout(layoutId).photoSlots[slotIndex];
  if (!rect) return null;
  const spec = PRINT_SPECS[format];
  const physical = {
    widthMm: rect.w * spec.pageWidthMm,
    heightMm: rect.h * spec.pageHeightMm,
  };
  return dpiStatus(
    effectiveDpi({ width: photo.width, height: photo.height }, physical, crop),
  );
}

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

// Controls for a selected cover photo slot — mirrors PhotoPanel for spreads.
export function CoverPhotoControls({
  slotIndex,
  photosById,
  onRequestPhotoPick,
}: CoverPhotoControlsProps) {
  const cover = useEditorStore((s) => s.document.cover);
  const format = useEditorStore((s) => s.document.format);
  const setCoverCrop = useEditorStore((s) => s.setCoverCrop);
  const clearCoverSlot = useEditorStore((s) => s.clearCoverSlot);

  const requestPick = () =>
    onRequestPhotoPick({ view: "cover", spreadIndex: 0, slotIndex });

  const slot: CoverSlot | undefined = cover.photoSlots[slotIndex];
  if (slot === undefined || slot.kind !== "photo") {
    return (
      <button
        type="button"
        onClick={requestPick}
        className="min-h-11 rounded-md bg-terracotta px-3 py-2 text-sm font-semibold text-paper transition-colors hover:bg-terracotta-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
      >
        {en.editor.slot.addPhoto}
      </button>
    );
  }

  const dpi = coverSlotDpi(
    format,
    cover.layoutId,
    slotIndex,
    photosById[slot.photoId],
    slot.crop,
  );

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-600">
        {en.editor.panel.zoom}
        <input
          type="range"
          min={1}
          max={MAX_CROP_SCALE}
          step={0.01}
          value={slot.crop.scale}
          onChange={(event) =>
            setCoverCrop(slotIndex, zoomCrop(slot.crop, Number(event.target.value)))
          }
          className="w-full accent-terracotta"
        />
      </label>
      {dpi && <DpiNotice status={dpi} />}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={requestPick}
          className={`${ACTION_BUTTON_CLASS} text-ink`}
        >
          {en.editor.panel.replace}
        </button>
        <button
          type="button"
          onClick={() => clearCoverSlot(slotIndex)}
          className={`${ACTION_BUTTON_CLASS} text-terracotta-deep`}
        >
          {en.editor.panel.remove}
        </button>
      </div>
    </div>
  );
}
