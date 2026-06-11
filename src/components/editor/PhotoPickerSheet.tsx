"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";

type PhotoPickerSheetProps = Readonly<{
  open: boolean;
  photos: PhotoDto[];
  usedCounts: Record<string, number>;
  onPick: (photoId: string) => void;
  onClose: () => void;
}>;

function usedLabel(count: number): string {
  if (count === 1) return en.tray.usedOnce;
  return en.tray.usedTimes.replace("{count}", String(count));
}

function PickerItem({
  photo,
  usedCount,
  onPick,
}: Readonly<{
  photo: PhotoDto;
  usedCount: number;
  onPick: (photoId: string) => void;
}>) {
  return (
    <button
      type="button"
      onClick={() => onPick(photo.id)}
      className="relative block aspect-square w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 transition-colors hover:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
    >
      {/* `unoptimized`: the storage route is session-cookie-authenticated, so
          the Next image optimizer (a cookieless server-side fetch) can never
          retrieve it. */}
      <Image
        src={photo.previewUrl}
        alt={photo.fileName}
        fill
        unoptimized
        sizes="(min-width: 640px) 120px, 30vw"
        className="object-cover"
      />
      {usedCount > 0 && (
        <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-paper">
          {usedLabel(usedCount)}
        </span>
      )}
    </button>
  );
}

export function PhotoPickerSheet({
  open,
  photos,
  usedCounts,
  onPick,
  onClose,
}: PhotoPickerSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Body scroll lock while the modal is open.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  // Escape closes; focus moves into the dialog on open. Registered in the
  // CAPTURE phase: while open this is the topmost modal, so it must consume
  // Escape (stopPropagation + preventDefault) before the bubble-phase
  // listeners of the mobile sheets and the canvas deselect underneath —
  // capture at window fires first and stopping propagation there prevents
  // the bubble-phase window listeners from ever seeing the keystroke.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={en.editor.picker.title}
        tabIndex={-1}
        className="relative flex max-h-[70vh] w-full flex-col rounded-t-xl bg-zinc-50 shadow-xl outline-none sm:max-w-lg sm:rounded-xl"
      >
        <h2 className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold text-ink">
          {en.editor.picker.title}
        </h2>
        <div className="flex-1 overflow-y-auto p-4">
          {photos.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {en.editor.picker.empty}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((photo) => (
                <li key={photo.id}>
                  <PickerItem
                    photo={photo}
                    usedCount={usedCounts[photo.id] ?? 0}
                    onPick={onPick}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-zinc-200 p-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            {en.editor.picker.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
