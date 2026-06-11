// ---------------------------------------------------------------------------
// Client-side preview generation. Originals off Sri Lankan phones are often
// 10MB+, and uploading them before the editor becomes usable would stall the
// whole flow on mobile connections. The client instead produces a ~1600px
// JPEG preview immediately (fast to upload, sharp enough for on-screen
// editing) while the original uploads in the background.
//
// IMPORTANT — reported dimensions are POST-EXIF-rotation. createImageBitmap
// is called with imageOrientation: "from-image", so EXIF rotation is baked
// into the bitmap before we measure it: originalWidth/originalHeight always
// describe the upright image. These values feed effectiveDpi(), and the DPI
// guard must judge the pixels that will actually print — a portrait shot
// stored as a rotated-landscape JPEG must report portrait dimensions.
//
// Sources smaller than PREVIEW_MAX_DIMENSION are still re-encoded to JPEG at
// their original size: previews are then uniformly JPEG (no HEIC/PNG special
// cases downstream) and metadata is stripped in the process.
// ---------------------------------------------------------------------------

export const PREVIEW_MAX_DIMENSION = 1600;
export const PREVIEW_JPEG_QUALITY = 0.82;

export interface PreviewResult {
  blob: Blob;
  originalWidth: number;
  originalHeight: number;
}

function clampDimension(value: number): number {
  return Math.max(1, Math.round(value));
}

// Fits (width, height) inside a maxDimension square. Dimensions already
// within the limit pass through unchanged; otherwise the longer side becomes
// exactly maxDimension and the shorter side is rounded, preserving aspect
// ratio. Both outputs are clamped to >= 1 so extreme aspect ratios (e.g.
// panoramas) can never produce a zero-sized canvas. Pure and total for
// positive inputs.
export function fitWithin(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const longer = Math.max(width, height);
  const scale = maxDimension / longer;
  return {
    width: width === longer ? maxDimension : clampDimension(width * scale),
    height: height === longer ? maxDimension : clampDimension(height * scale),
  };
}

async function decodeBitmap(file: File): Promise<ImageBitmap> {
  try {
    // "from-image" applies EXIF orientation during decode, so the bitmap —
    // and everything derived from it — is already upright.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (cause) {
    throw new Error(
      `Could not decode image "${file.name}" (${file.type || "unknown type"}, ${file.size} bytes)`,
      { cause },
    );
  }
}

async function encodeViaOffscreenCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob> {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not acquire a 2d OffscreenCanvas context for preview encoding");
  }
  // Chrome defaults smoothing quality to "low" — a single-pass 8000→1600px
  // downscale would alias on the preview customers judge crops with.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  try {
    return await canvas.convertToBlob({
      type: "image/jpeg",
      quality: PREVIEW_JPEG_QUALITY,
    });
  } catch (cause) {
    throw new Error(
      `Could not encode ${width}x${height} JPEG preview (convertToBlob failed)`,
      { cause },
    );
  }
}

async function encodeViaDomCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error(
      "generatePreview requires a browser environment (neither OffscreenCanvas nor document is available)",
    );
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not acquire a 2d canvas context for preview encoding");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error(
              `Could not encode ${width}x${height} JPEG preview (canvas.toBlob returned null)`,
            ),
          );
        }
      },
      "image/jpeg",
      PREVIEW_JPEG_QUALITY,
    );
  });
}

// Async so every failure mode — including sync throws in the fallbacks —
// uniformly surfaces as a rejection at any call site.
async function encodeJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    return encodeViaOffscreenCanvas(bitmap, width, height);
  }
  return encodeViaDomCanvas(bitmap, width, height);
}

// Browser-only. Decodes the file (EXIF rotation baked in), downscales to fit
// PREVIEW_MAX_DIMENSION and re-encodes as JPEG. Rejects with a descriptive
// Error when decoding or encoding fails; the caller maps that to the
// invalid_input upload error path.
export async function generatePreview(file: File): Promise<PreviewResult> {
  const bitmap = await decodeBitmap(file);
  try {
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    const target = fitWithin(originalWidth, originalHeight, PREVIEW_MAX_DIMENSION);
    const blob = await encodeJpeg(bitmap, target.width, target.height);
    return { blob, originalWidth, originalHeight };
  } finally {
    bitmap.close();
  }
}
