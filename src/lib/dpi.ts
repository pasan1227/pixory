import { visibleRect } from "@/lib/crop";
import type { Size } from "@/lib/crop";
import { slotPhysicalSizeMm } from "@/lib/print-specs";
import type { BookFormat, Crop } from "@/types/book";
import type { SlotDef } from "@/types/layout";

// ---------------------------------------------------------------------------
// Print-resolution guard. Effective DPI is what the photo's visible region
// resolves to at the slot's physical print size; policy (CLAUDE.md):
//   dpi <  100 → "blocked"  (checkout blocked for that slot)
//   100 ≤ dpi < 150 → "warning"
//   dpi ≥ 150 → "ok"
// Pure and deterministic — shared by the editor, checkout validation and the
// print pipeline. All geometry comes from visibleRect(); never reimplemented.
// ---------------------------------------------------------------------------

export const DPI_BLOCK_BELOW = 100;
export const DPI_WARN_BELOW = 150;

export type DpiStatus = "ok" | "warning" | "blocked";

const MM_PER_INCH = 25.4;

export function mmToInches(mm: number): number {
  return mm / MM_PER_INCH;
}

// DPI of the photo region visible through the slot, at the slot's physical
// print size. Width and height DPI are equal by construction: the visible
// region's aspect ratio matches the slot's, so a single number suffices.
export function effectiveDpi(
  photoPx: { width: number; height: number },
  slotPhysical: { widthMm: number; heightMm: number },
  crop: Crop,
): number {
  const slotAspect = slotPhysical.widthMm / slotPhysical.heightMm;
  const v = visibleRect(photoPx, slotAspect, crop);
  const visiblePixelWidth = photoPx.width * v.w;
  return visiblePixelWidth / mmToInches(slotPhysical.widthMm);
}

export function dpiStatus(dpi: number): DpiStatus {
  if (dpi < DPI_BLOCK_BELOW) return "blocked";
  if (dpi < DPI_WARN_BELOW) return "warning";
  return "ok";
}

// Effective DPI + policy status for a photo placed in a layout slot of the
// given book format.
export function slotDpiStatus(
  photoPx: Size,
  format: BookFormat,
  slot: Pick<SlotDef, "w" | "h">,
  crop: Crop,
): { dpi: number; status: DpiStatus } {
  const dpi = effectiveDpi(photoPx, slotPhysicalSizeMm(format, slot), crop);
  return { dpi, status: dpiStatus(dpi) };
}
