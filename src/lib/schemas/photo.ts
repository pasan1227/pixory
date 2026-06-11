import { z } from "zod";

// Upload limits and accepted types — shared by the client pipeline (pre-flight
// checks) and the server actions (authoritative enforcement).
export const PREVIEW_MAX_BYTES = 3 * 1024 * 1024;
export const ORIGINAL_MAX_BYTES = 25 * 1024 * 1024;
export const ACCEPTED_UPLOAD_MIME_TYPES = ["image/jpeg", "image/png"] as const;
// HEIC is recognized so the UI can show a friendly "unsupported in v1"
// message instead of a generic type error.
export const HEIC_MIME_TYPES = ["image/heic", "image/heif"] as const;

// Hard ceiling on original pixel dimensions (guards canvas/DPI math).
export const MAX_PIXEL_DIMENSION = 20000;

const pixelDimension = z.coerce
  .number()
  .int()
  .positive()
  .max(MAX_PIXEL_DIMENSION);

// FormData fields accompanying a preview upload (everything arrives as
// strings; coerce on the boundary).
export const uploadPreviewFieldsSchema = z.object({
  bookId: z.string().min(1),
  photoId: z.uuid(),
  width: pixelDimension,
  height: pixelDimension,
  fileName: z.string().min(1).max(255),
  capturedAt: z
    .string()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.iso.datetime({ offset: true }).nullable()),
});

export const uploadOriginalFieldsSchema = z.object({
  bookId: z.string().min(1),
  photoId: z.uuid(),
});

export const deletePhotoInputSchema = z.object({
  bookId: z.string().min(1),
  photoId: z.string().min(1),
});

// What the client sees — storage keys never leave the server.
export const photoDtoSchema = z.object({
  id: z.string(),
  previewUrl: z.string(),
  originalUploaded: z.boolean(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fileName: z.string(),
  capturedAt: z.iso.datetime({ offset: true }).nullable(),
  createdAt: z.iso.datetime({ offset: true }),
});

export type PhotoDto = z.infer<typeof photoDtoSchema>;

// Stable, user-presentable failure codes — the client maps them to i18n
// strings (en.tray.errors.*).
export const UPLOAD_ERROR_CODES = [
  "not_found",
  "invalid_input",
  "file_missing",
  "file_too_large",
  "unsupported_type",
  "heic_unsupported",
] as const;

export type UploadErrorCode = (typeof UPLOAD_ERROR_CODES)[number];

export type UploadResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: UploadErrorCode };
