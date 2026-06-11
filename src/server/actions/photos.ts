"use server";

import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  HEIC_MIME_TYPES,
  ORIGINAL_MAX_BYTES,
  PREVIEW_MAX_BYTES,
  deletePhotoInputSchema,
  uploadOriginalFieldsSchema,
  uploadPreviewFieldsSchema,
  type PhotoDto,
  type UploadErrorCode,
  type UploadResult,
} from "@/lib/schemas/photo";
import { toPhotoDto } from "@/server/photo-dto";
import {
  createPhoto,
  deletePhoto,
  markOriginalUploaded,
} from "@/server/repositories/photos";
import { getStorage } from "@/server/storage";
import { photoOriginalKey, photoPreviewKey } from "@/server/storage/keys";
import { getSessionToken } from "@/server/session";

// Upload flow: the client sends a ~1600px JPEG preview first (instant tray),
// then streams the original in the background. Both validated here — client
// checks are UX, these are the law.

type FileCheck =
  | { ok: true; file: File }
  | { ok: false; error: UploadErrorCode };

function checkFile(
  value: FormDataEntryValue | null,
  maxBytes: number,
  acceptJpegOnly: boolean,
): FileCheck {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, error: "file_missing" };
  }
  const heic = (HEIC_MIME_TYPES as readonly string[]).includes(value.type);
  if (heic) return { ok: false, error: "heic_unsupported" };
  const accepted = acceptJpegOnly
    ? value.type === "image/jpeg"
    : (ACCEPTED_UPLOAD_MIME_TYPES as readonly string[]).includes(value.type);
  if (!accepted) return { ok: false, error: "unsupported_type" };
  if (value.size > maxBytes) return { ok: false, error: "file_too_large" };
  return { ok: true, file: value };
}

export async function uploadPhotoPreviewAction(
  formData: FormData,
): Promise<UploadResult<PhotoDto>> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "not_found" };

  const fields = uploadPreviewFieldsSchema.safeParse(
    Object.fromEntries(
      ["bookId", "photoId", "width", "height", "fileName", "capturedAt"].map(
        (name) => [name, formData.get(name) ?? ""],
      ),
    ),
  );
  if (!fields.success) return { ok: false, error: "invalid_input" };

  // Previews are always canvas-generated JPEGs.
  const file = checkFile(formData.get("file"), PREVIEW_MAX_BYTES, true);
  if (!file.ok) return file;

  const { bookId, photoId, width, height, fileName, capturedAt } = fields.data;
  const previewKey = photoPreviewKey(bookId, photoId);
  await getStorage().put(
    previewKey,
    new Uint8Array(await file.file.arrayBuffer()),
    "image/jpeg",
  );

  const record = await createPhoto({
    id: photoId,
    bookId,
    sessionToken,
    previewKey,
    width,
    height,
    fileName,
    capturedAt: capturedAt ? new Date(capturedAt) : null,
  });
  if (!record) {
    // Foreign/missing book: drop the orphaned bytes and report not found.
    await getStorage().delete(previewKey);
    return { ok: false, error: "not_found" };
  }
  return { ok: true, value: toPhotoDto(record) };
}

export async function uploadPhotoOriginalAction(
  formData: FormData,
): Promise<UploadResult<PhotoDto>> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "not_found" };

  const fields = uploadOriginalFieldsSchema.safeParse({
    bookId: formData.get("bookId") ?? "",
    photoId: formData.get("photoId") ?? "",
  });
  if (!fields.success) return { ok: false, error: "invalid_input" };

  const file = checkFile(formData.get("file"), ORIGINAL_MAX_BYTES, false);
  if (!file.ok) return file;

  const extension = file.file.type === "image/png" ? "png" : "jpg";
  const originalKey = photoOriginalKey(
    fields.data.bookId,
    fields.data.photoId,
    extension,
  );
  await getStorage().put(
    originalKey,
    new Uint8Array(await file.file.arrayBuffer()),
    file.file.type,
  );

  const record = await markOriginalUploaded(
    fields.data.photoId,
    sessionToken,
    originalKey,
  );
  if (!record) {
    await getStorage().delete(originalKey);
    return { ok: false, error: "not_found" };
  }
  return { ok: true, value: toPhotoDto(record) };
}

export async function deletePhotoAction(input: {
  bookId: string;
  photoId: string;
}): Promise<UploadResult<{ id: string }>> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "not_found" };

  const parsed = deletePhotoInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const record = await deletePhoto(parsed.data.photoId, sessionToken);
  if (!record) return { ok: false, error: "not_found" };

  const storage = getStorage();
  await storage.delete(record.previewKey);
  if (record.originalKey) await storage.delete(record.originalKey);
  return { ok: true, value: { id: record.id } };
}
