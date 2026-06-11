import { MAX_CROP_SCALE } from "@/lib/schemas/book";
import type { Crop } from "@/types/book";

// ---------------------------------------------------------------------------
// Crop geometry — the single mathematical contract for how a photo sits inside
// a slot. Screen rendering, thumbnails, DPI checks and the print pipeline all
// derive from visibleRect(); none of them reimplement this math.
//
// Model: a photo always cover-fits its slot (scaled to the smallest size that
// fully fills it), then crop.scale (≥ 1) zooms in further. crop.x / crop.y
// select where the slot window sits within the photo, as the fraction of the
// available pan range consumed: 0 = flush to the photo's left/top edge,
// 1 = flush right/bottom, 0.5 = centered. Every {x, y} in [0,1] is therefore
// valid at any zoom — the photo can never show past its own edges.
// ---------------------------------------------------------------------------

export interface Size {
  width: number;
  height: number;
}

// A region in photo-normalized coordinates: x/y/w/h as fractions of the
// photo's own width and height.
export interface PhotoRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DEFAULT_CROP: Crop = { x: 0.5, y: 0.5, scale: 1 };

export function clampCrop(crop: Crop): Crop {
  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  return {
    x: clamp01(crop.x),
    y: clamp01(crop.y),
    scale: Math.min(MAX_CROP_SCALE, Math.max(1, crop.scale)),
  };
}

// The region of the photo visible through a slot of the given aspect ratio
// (width / height — use the slot's *physical* aspect via slotAspectRatio(),
// not the normalized rect's, since spread axes have different units).
export function visibleRect(
  photo: Size,
  slotAspect: number,
  crop: Crop,
): PhotoRegion {
  const c = clampCrop(crop);
  const photoAspect = photo.width / photo.height;
  // Cover fit: the photo's relatively narrower axis exactly spans the slot;
  // the other axis overflows and gets cropped. Zoom shrinks both.
  const wider = photoAspect >= slotAspect;
  const w = (wider ? slotAspect / photoAspect : 1) / c.scale;
  const h = (wider ? 1 : photoAspect / slotAspect) / c.scale;
  return {
    x: c.x * (1 - w),
    y: c.y * (1 - h),
    w,
    h,
  };
}

// Pixel placement of the photo inside a slot rendered at slotPx — the size of
// the <img> and its offset so that exactly visibleRect() shows through.
export function cropToCss(
  photo: Size,
  slotPx: Size,
  crop: Crop,
): { width: number; height: number; left: number; top: number } {
  const v = visibleRect(photo, slotPx.width / slotPx.height, crop);
  const width = slotPx.width / v.w;
  const height = slotPx.height / v.h;
  return { width, height, left: -v.x * width, top: -v.y * height };
}

// Drag-to-pan: convert a pointer delta (slot pixels) into an updated crop.
// Dragging the photo right (positive dx) reveals more of its left side.
export function panCropByPixels(
  photo: Size,
  slotPx: Size,
  crop: Crop,
  dxPx: number,
  dyPx: number,
): Crop {
  const { width, height } = cropToCss(photo, slotPx, crop);
  const rangeX = width - slotPx.width;
  const rangeY = height - slotPx.height;
  const c = clampCrop(crop);
  return clampCrop({
    x: rangeX > 0 ? c.x - dxPx / rangeX : c.x,
    y: rangeY > 0 ? c.y - dyPx / rangeY : c.y,
    scale: c.scale,
  });
}

// Zoom while keeping the center of the visible region fixed (slider zoom).
// With the pan-fraction model this is the identity on x/y: the center stays
// put for any scale because the pan range rescales symmetrically around it.
export function zoomCrop(crop: Crop, scale: number): Crop {
  return clampCrop({ ...crop, scale });
}
