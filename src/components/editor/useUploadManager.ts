"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { generatePreview, type PreviewResult } from "@/lib/image-preview";
import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  HEIC_MIME_TYPES,
  ORIGINAL_MAX_BYTES,
  type PhotoDto,
  type UploadErrorCode,
} from "@/lib/schemas/photo";
import {
  createUploadQueue,
  type UploadQueue,
  type UploadTaskStatus,
} from "@/lib/upload-queue";
import {
  deletePhotoAction,
  uploadPhotoOriginalAction,
  uploadPhotoPreviewAction,
} from "@/server/actions/photos";

// Two-stage upload per photo: a small client-generated JPEG preview first
// (the photo becomes usable in the tray the moment it lands), then the
// original in the background. Previews outrank originals in the queue so a
// burst of new photos never waits behind multi-MB originals.
const PREVIEW_PRIORITY = 2;
const ORIGINAL_PRIORITY = 1;
const CONCURRENCY = 3;
const MAX_AUTO_RETRIES = 1;

export interface UploadItem {
  id: string;
  fileName: string;
  status: "processing" | "uploading" | "saving-original" | "failed";
  errorCode: UploadErrorCode | null;
}

export interface UploadManager {
  photos: PhotoDto[];
  uploads: UploadItem[];
  addFiles(files: File[]): void;
  retryUpload(id: string): void;
  // Clear a failed upload row (deterministic failures can't be retried).
  dismissUpload(id: string): void;
  removePhoto(photoId: string): Promise<void>;
}

// "local" = no queue task exists (pre-checks, preview generation, EXIF read).
type UploadPhase = "local" | "preview" | "original";

interface TrackedUpload {
  id: string; // also the photoId sent to the server
  fileName: string;
  phase: UploadPhase;
  // Deterministic failure (pre-check or server {ok:false}). Never auto-retried:
  // the same input would fail the same way. Only thrown/network errors go
  // through the queue's retry machinery, where errorCode stays null.
  errorCode: UploadErrorCode | null;
}

function isHeicFile(file: File): boolean {
  if ((HEIC_MIME_TYPES as readonly string[]).includes(file.type)) return true;
  return /\.hei[cf]$/i.test(file.name);
}

function precheckFile(file: File): UploadErrorCode | null {
  if (isHeicFile(file)) return "heic_unsupported";
  if (!(ACCEPTED_UPLOAD_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "unsupported_type";
  }
  if (file.size > ORIGINAL_MAX_BYTES) return "file_too_large";
  return null;
}

// Match the server's tray order: capturedAt asc with nulls last, then
// createdAt asc. ISO-8601 UTC strings compare correctly as plain strings.
function compareNullableIso(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

function comparePhotos(a: PhotoDto, b: PhotoDto): number {
  const byCaptured = compareNullableIso(a.capturedAt, b.capturedAt);
  if (byCaptured !== 0) return byCaptured;
  return compareNullableIso(a.createdAt, b.createdAt);
}

function pickCaptureDate(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const record = data as Record<string, unknown>;
  const value = record.DateTimeOriginal ?? record.CreateDate;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

// EXIF capture date, or null. Dynamic import keeps exifr out of the editor's
// initial bundle; any parse failure simply means "undated".
async function readCaptureDate(file: File): Promise<string | null> {
  try {
    const exifr = await import("exifr");
    const data: unknown = await exifr.parse(file, [
      "DateTimeOriginal",
      "CreateDate",
    ]);
    return pickCaptureDate(data);
  } catch {
    return null;
  }
}

function buildPreviewFormData(
  bookId: string,
  entry: TrackedUpload,
  preview: PreviewResult,
  capturedAt: string | null,
): FormData {
  const formData = new FormData();
  formData.append("bookId", bookId);
  formData.append("photoId", entry.id);
  // Width/height are the ORIGINAL pixel dimensions (post-EXIF-rotation) —
  // they feed the DPI guard, not the preview's downscaled size.
  formData.append("width", String(preview.originalWidth));
  formData.append("height", String(preview.originalHeight));
  formData.append("fileName", entry.fileName);
  formData.append("capturedAt", capturedAt ?? "");
  formData.append("file", preview.blob, "preview.jpg");
  return formData;
}

function toUploadItem(
  entry: TrackedUpload,
  taskStatus: UploadTaskStatus | undefined,
): UploadItem {
  const base = { id: entry.id, fileName: entry.fileName };
  if (entry.errorCode !== null) {
    return { ...base, status: "failed", errorCode: entry.errorCode };
  }
  if (entry.phase === "local") {
    return { ...base, status: "processing", errorCode: null };
  }
  if (taskStatus === "failed") {
    return { ...base, status: "failed", errorCode: null };
  }
  const status = entry.phase === "preview" ? "uploading" : "saving-original";
  return { ...base, status, errorCode: null };
}

function buildUploadItems(
  entries: Map<string, TrackedUpload>,
  queue: UploadQueue,
): UploadItem[] {
  const taskStatuses = new Map(
    queue.getTasks().map((task) => [task.id, task.status]),
  );
  return [...entries.values()].map((entry) =>
    toUploadItem(entry, taskStatuses.get(`${entry.id}:${entry.phase}`)),
  );
}

export function useUploadManager({
  bookId,
  initialPhotos,
}: {
  bookId: string;
  initialPhotos: PhotoDto[];
}): UploadManager {
  const [queue] = useState(() =>
    createUploadQueue({
      concurrency: CONCURRENCY,
      maxAutoRetries: MAX_AUTO_RETRIES,
    }),
  );
  const entriesRef = useRef<Map<string, TrackedUpload>>(new Map());
  const [photos, setPhotos] = useState<PhotoDto[]>(initialPhotos);
  const [uploads, setUploads] = useState<UploadItem[]>([]);

  // Ref mirror of the photo list so async flows (removePhoto) can read the
  // current value without side effects inside state updaters. The ref is the
  // source of truth; setPhotos only publishes it.
  const photosRef = useRef<PhotoDto[]>(initialPhotos);
  const updatePhotos = useCallback(
    (updater: (prev: PhotoDto[]) => PhotoDto[]) => {
      photosRef.current = updater(photosRef.current);
      setPhotos(photosRef.current);
    },
    [],
  );

  // The queue is imperative; every transition (its own, or ours via
  // entriesRef) is mirrored into React state by rebuilding the uploads list.
  const refreshUploads = useCallback(() => {
    setUploads(buildUploadItems(entriesRef.current, queue));
  }, [queue]);

  useEffect(() => queue.subscribe(refreshUploads), [queue, refreshUploads]);

  const enqueueOriginal = useCallback(
    (entry: TrackedUpload, file: File) => {
      queue.enqueue({
        id: `${entry.id}:original`,
        priority: ORIGINAL_PRIORITY,
        run: async () => {
          const formData = new FormData();
          formData.append("bookId", bookId);
          formData.append("photoId", entry.id);
          formData.append("file", file);
          const result = await uploadPhotoOriginalAction(formData);
          if (!result.ok) {
            // Deterministic rejection — resolve (no queue auto-retry).
            entry.errorCode = result.error;
            refreshUploads();
            return;
          }
          updatePhotos((prev) =>
            prev.map((photo) => (photo.id === entry.id ? result.value : photo)),
          );
          entriesRef.current.delete(entry.id);
          refreshUploads();
        },
      });
    },
    [bookId, queue, refreshUploads, updatePhotos],
  );

  const enqueuePreview = useCallback(
    (
      entry: TrackedUpload,
      file: File,
      preview: PreviewResult,
      capturedAt: string | null,
    ) => {
      queue.enqueue({
        id: `${entry.id}:preview`,
        priority: PREVIEW_PRIORITY,
        run: async () => {
          const result = await uploadPhotoPreviewAction(
            buildPreviewFormData(bookId, entry, preview, capturedAt),
          );
          if (!result.ok) {
            // Deterministic rejection — resolve (no queue auto-retry).
            entry.errorCode = result.error;
            refreshUploads();
            return;
          }
          // Photo is usable as soon as the preview lands.
          updatePhotos((prev) => [...prev, result.value].sort(comparePhotos));
          entry.phase = "original";
          enqueueOriginal(entry, file);
          refreshUploads();
        },
      });
    },
    [bookId, queue, refreshUploads, enqueueOriginal, updatePhotos],
  );

  const processFile = useCallback(
    async (file: File) => {
      const entry: TrackedUpload = {
        id: crypto.randomUUID(),
        fileName: file.name,
        phase: "local",
        errorCode: null,
      };
      entriesRef.current.set(entry.id, entry);
      entry.errorCode = precheckFile(file);
      refreshUploads();
      if (entry.errorCode !== null) return;
      let preview: PreviewResult;
      try {
        preview = await generatePreview(file);
      } catch {
        entry.errorCode = "invalid_input";
        refreshUploads();
        return;
      }
      const capturedAt = await readCaptureDate(file);
      entry.phase = "preview";
      enqueuePreview(entry, file, preview, capturedAt);
    },
    [enqueuePreview, refreshUploads],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      for (const file of files) void processFile(file);
    },
    [processFile],
  );

  const retryUpload = useCallback(
    (id: string) => {
      const entry = entriesRef.current.get(id);
      // Local failures (HEIC, bad type, undecodable) have no queue task and
      // would fail identically again — retry is a no-op for them.
      if (!entry || entry.phase === "local") return;
      queue.retry(`${entry.id}:${entry.phase}`);
    },
    [queue],
  );

  // Drop any in-flight tracking for a photo the user just removed, so a
  // pending original upload doesn't surface as a ghost failure afterwards.
  const discardUpload = useCallback(
    (photoId: string) => {
      if (!entriesRef.current.delete(photoId)) return;
      for (const phase of ["preview", "original"] as const) {
        try {
          queue.remove(`${photoId}:${phase}`);
        } catch {
          // Task is mid-flight and cannot be cancelled; let it settle silently.
        }
      }
      refreshUploads();
    },
    [queue, refreshUploads],
  );

  const removePhoto = useCallback(
    async (photoId: string) => {
      const removed = photosRef.current.find((photo) => photo.id === photoId);
      if (!removed) return;
      // Optimistic removal — but keep upload tracking alive until the server
      // confirms, so a failed delete restores a photo whose original upload
      // still completes.
      updatePhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      let ok = false;
      try {
        ok = (await deletePhotoAction({ bookId, photoId })).ok;
      } catch {
        ok = false;
      }
      if (ok) {
        discardUpload(photoId);
      } else {
        updatePhotos((prev) => [...prev, removed].sort(comparePhotos));
      }
    },
    [bookId, discardUpload, updatePhotos],
  );

  return {
    photos,
    uploads,
    addFiles,
    retryUpload,
    dismissUpload: discardUpload,
    removePhoto,
  };
}
