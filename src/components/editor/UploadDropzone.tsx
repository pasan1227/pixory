"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { en } from "@/i18n/en";
import { ACCEPTED_UPLOAD_MIME_TYPES } from "@/lib/schemas/photo";

// The picker only offers JPEG/PNG, but drag-and-drop bypasses `accept` —
// HEIC and friends can still arrive via onDrop; the upload manager's
// pre-checks handle those with a friendly error.
const ACCEPT = ACCEPTED_UPLOAD_MIME_TYPES.join(",");

interface UploadDropzoneProps {
  onAddFiles: (files: File[]) => void;
}

export function UploadDropzone({ onAddFiles }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragOver(true);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onAddFiles(files);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset so picking the same file again re-fires onChange.
    event.target.value = "";
    if (files.length > 0) onAddFiles(files);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 ${
          isDragOver
            ? "border-terracotta bg-terracotta/10"
            : "border-zinc-300 bg-zinc-100/60 hover:border-zinc-400"
        }`}
      >
        {/* pointer-events-none so children don't fire dragleave flicker. */}
        <span className="pointer-events-none text-sm font-medium text-ink">
          {en.tray.addPhotos}
        </span>
        <span className="pointer-events-none text-xs text-zinc-500">
          {en.tray.dropHint}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}
