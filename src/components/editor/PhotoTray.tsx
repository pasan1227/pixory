"use client";

import { en } from "@/i18n/en";
import { AutoCreateCta } from "@/components/editor/AutoCreateCta";
import { PhotoTrayItem } from "@/components/editor/PhotoTrayItem";
import { UploadDropzone } from "@/components/editor/UploadDropzone";
import type {
  UploadItem,
  UploadManager,
} from "@/components/editor/useUploadManager";
import type { PhotoDto } from "@/lib/schemas/photo";

const STATUS_TEXT: Record<Exclude<UploadItem["status"], "failed">, string> = {
  processing: en.tray.processing,
  uploading: en.tray.uploading,
  "saving-original": en.tray.savingOriginal,
};

const ROW_BUTTON_CLASS =
  "shrink-0 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-ink transition-colors hover:border-zinc-400 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta";

function UploadRow({
  upload,
  onRetry,
  onDismiss,
}: {
  upload: UploadItem;
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const failed = upload.status === "failed";
  const statusText =
    upload.status === "failed" ? en.tray.failed : STATUS_TEXT[upload.status];
  // Deterministic failures (errorCode set) would fail identically again —
  // they get a dismiss control instead of a dead retry button.
  const retryable = failed && upload.errorCode === null;
  return (
    <li className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-100/60 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-ink">
          {upload.fileName}
        </p>
        <p
          className={
            failed ? "text-xs text-terracotta-deep" : "text-xs text-zinc-500"
          }
        >
          {statusText}
        </p>
        {failed && upload.errorCode !== null && (
          <p className="text-xs text-zinc-500">
            {en.tray.errors[upload.errorCode]}
          </p>
        )}
      </div>
      {retryable && (
        <button
          type="button"
          onClick={() => onRetry(upload.id)}
          className={ROW_BUTTON_CLASS}
        >
          {en.tray.retry}
        </button>
      )}
      {failed && (
        <button
          type="button"
          onClick={() => onDismiss(upload.id)}
          className={ROW_BUTTON_CLASS}
        >
          {en.tray.dismiss}
        </button>
      )}
    </li>
  );
}

export function PhotoTray({
  manager,
  usedCounts = {},
  onAutoCreate,
  autoCreateBookIsEmpty = false,
  autoCreateLeftoverCount = null,
}: Readonly<{
  manager: UploadManager;
  usedCounts?: Record<string, number>;
  onAutoCreate?: (photos: PhotoDto[]) => void;
  autoCreateBookIsEmpty?: boolean;
  autoCreateLeftoverCount?: number | null;
}>) {
  const { photos, uploads, addFiles, retryUpload, dismissUpload, removePhoto } =
    manager;

  const isEmpty = photos.length === 0 && uploads.length === 0;

  return (
    <section
      aria-label={en.tray.title}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
    >
      <h2 className="text-sm font-semibold text-ink">{en.tray.title}</h2>
      {onAutoCreate && photos.length > 0 && (
        <AutoCreateCta
          photos={photos}
          bookIsEmpty={autoCreateBookIsEmpty}
          leftoverCount={autoCreateLeftoverCount}
          onAutoCreate={onAutoCreate}
        />
      )}
      <UploadDropzone onAddFiles={addFiles} />
      {uploads.length > 0 && (
        // Polite live region so status changes and failures (the only feedback
        // for e.g. a rejected HEIC drop) reach screen readers.
        <ul role="status" aria-live="polite" className="flex flex-col gap-1.5">
          {uploads.map((upload) => (
            <UploadRow
              key={upload.id}
              upload={upload}
              onRetry={retryUpload}
              onDismiss={dismissUpload}
            />
          ))}
        </ul>
      )}
      {isEmpty ? (
        <p className="px-2 py-4 text-center text-xs text-zinc-500">
          {en.tray.empty}
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <li key={photo.id}>
              <PhotoTrayItem
                photo={photo}
                usedCount={usedCounts[photo.id] ?? 0}
                onRemove={(photoId) => void removePhoto(photoId)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
