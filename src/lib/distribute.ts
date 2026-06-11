import { DEFAULT_SPREAD_LAYOUT_ID, getSpreadLayout } from "@/data/layouts";
import { DEFAULT_CROP } from "@/lib/crop";
import { spreadBounds } from "@/lib/print-specs";
import type { BookFormat, SlotContent, Spread } from "@/types/book";

// ---------------------------------------------------------------------------
// Auto-create engine — "Fill my book automatically".
//
// Deterministic, pure photo distribution: photos are sorted chronologically,
// grouped by calendar day, chunked into spreads of 1–4, and assigned a layout
// based on orientation. Every input photo ends up either placed on a spread
// or in leftoverPhotoIds — never dropped silently.
// ---------------------------------------------------------------------------

export interface DistributablePhoto {
  id: string;
  width: number;
  height: number;
  capturedAt: Date | null;
}

export interface DistributionResult {
  spreads: Spread[];
  leftoverPhotoIds: string[];
}

// The largest all-photo layout (spread-quad) holds 4 photos.
const MAX_PHOTOS_PER_SPREAD = 4;

// Padding spreads appended to reach minSpreads use the default layout with all
// slots empty — derived from layouts.ts so slot counts can never drift.
const PADDING_LAYOUT = getSpreadLayout(DEFAULT_SPREAD_LAYOUT_ID);

// Dated photos sort before undated; among dated, ascending by capture time.
// Returning 0 for equal keys keeps Array.prototype.sort's stability intact,
// so ties and undated photos preserve input order.
function compareByCapturedAt(
  a: DistributablePhoto,
  b: DistributablePhoto,
): number {
  if (a.capturedAt === null && b.capturedAt === null) return 0;
  if (a.capturedAt === null) return 1;
  if (b.capturedAt === null) return -1;
  return a.capturedAt.getTime() - b.capturedAt.getTime();
}

function sortChronologically(
  photos: DistributablePhoto[],
): DistributablePhoto[] {
  return [...photos].sort(compareByCapturedAt);
}

// UTC calendar day key; all undated photos share one sentinel key so they
// form a single trailing run (they sort after every dated photo).
function utcDayKey(capturedAt: Date | null): string {
  if (capturedAt === null) return "undated";
  return capturedAt.toISOString().slice(0, 10);
}

// Split sorted photos into consecutive runs sharing the same UTC day.
function splitIntoDayRuns(
  photos: DistributablePhoto[],
): DistributablePhoto[][] {
  const runs: DistributablePhoto[][] = [];
  let previousKey: string | null = null;
  for (const photo of photos) {
    const key = utcDayKey(photo.capturedAt);
    const lastRun = runs[runs.length - 1];
    if (lastRun !== undefined && key === previousKey) {
      lastRun.push(photo);
    } else {
      runs.push([photo]);
      previousKey = key;
    }
  }
  return runs;
}

// Chunk sizing within a run: take 4 while at least 6 remain; a remainder of 5
// splits 3 + 2 (never 4 + 1); anything smaller is taken whole.
function nextChunkSize(remaining: number): number {
  if (remaining >= 6) return MAX_PHOTOS_PER_SPREAD;
  if (remaining === 5) return 3;
  return Math.min(remaining, MAX_PHOTOS_PER_SPREAD);
}

function chunkRun(run: DistributablePhoto[]): DistributablePhoto[][] {
  const chunks: DistributablePhoto[][] = [];
  let index = 0;
  while (index < run.length) {
    const size = nextChunkSize(run.length - index);
    chunks.push(run.slice(index, index + size));
    index += size;
  }
  return chunks;
}

function chunkByDay(photos: DistributablePhoto[]): DistributablePhoto[][] {
  return splitIntoDayRuns(photos).flatMap(chunkRun);
}

// Fallback when day grouping would exceed maxSpreads: plain sequential groups
// of 4. Given photos.length <= maxSpreads * 4 this yields <= maxSpreads chunks.
function chunkByCapacity(
  photos: DistributablePhoto[],
): DistributablePhoto[][] {
  const chunks: DistributablePhoto[][] = [];
  for (let i = 0; i < photos.length; i += MAX_PHOTOS_PER_SPREAD) {
    chunks.push(photos.slice(i, i + MAX_PHOTOS_PER_SPREAD));
  }
  return chunks;
}

function isLandscape(photo: DistributablePhoto): boolean {
  return photo.width >= photo.height;
}

// All chosen layouts are all-photo layouts, so every slot gets filled.
function layoutIdForChunk(chunk: DistributablePhoto[]): string {
  if (chunk.length === 1) {
    return isLandscape(chunk[0]) ? "spread-full" : "spread-single";
  }
  if (chunk.length === 2) {
    return chunk.every(isLandscape) ? "spread-pages" : "spread-duo";
  }
  if (chunk.length === 3) {
    return isLandscape(chunk[0]) ? "spread-trio-right" : "spread-trio-left";
  }
  return "spread-quad";
}

function spreadId(index: number): string {
  return `spread-${index + 1}`;
}

function buildPhotoSpread(chunk: DistributablePhoto[], index: number): Spread {
  const slots: SlotContent[] = chunk.map((photo) => ({
    kind: "photo",
    photoId: photo.id,
    crop: { ...DEFAULT_CROP },
  }));
  return { id: spreadId(index), layoutId: layoutIdForChunk(chunk), slots };
}

function buildEmptySpread(index: number): Spread {
  const slots: SlotContent[] = PADDING_LAYOUT.slots.map(() => ({
    kind: "empty",
  }));
  return { id: spreadId(index), layoutId: PADDING_LAYOUT.id, slots };
}

export function distributePhotos(
  photos: DistributablePhoto[],
  format: BookFormat,
): DistributionResult {
  const { minSpreads, maxSpreads } = spreadBounds(format);
  const sorted = sortChronologically(photos);

  const capacity = maxSpreads * MAX_PHOTOS_PER_SPREAD;
  const kept = sorted.slice(0, capacity);
  const leftoverPhotoIds = sorted.slice(capacity).map((photo) => photo.id);

  const dayChunks = chunkByDay(kept);
  const chunks =
    dayChunks.length > maxSpreads ? chunkByCapacity(kept) : dayChunks;

  const spreads = chunks.map(buildPhotoSpread);
  for (let i = spreads.length; i < minSpreads; i += 1) {
    spreads.push(buildEmptySpread(i));
  }

  return { spreads, leftoverPhotoIds };
}
