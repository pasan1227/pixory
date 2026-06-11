"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";

interface PhotoTrayItemProps {
  photo: PhotoDto;
  usedCount: number;
  onRemove: (photoId: string) => void;
}

function usedLabel(count: number): string {
  if (count === 1) return en.tray.usedOnce;
  return en.tray.usedTimes.replace("{count}", String(count));
}

export function PhotoTrayItem({ photo, usedCount, onRemove }: PhotoTrayItemProps) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
      {/* `unoptimized`: the storage route is session-cookie-authenticated, so
          the Next image optimizer (a server-side fetch without the user's
          cookies) can never retrieve it. The preview is already a small
          client-generated JPEG, so optimization buys nothing anyway. */}
      <Image
        src={photo.previewUrl}
        alt={photo.fileName}
        fill
        unoptimized
        sizes="(min-width: 1024px) 96px, 30vw"
        className="object-cover"
      />
      {usedCount > 0 && (
        <span className="absolute left-1 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-paper">
          {usedLabel(usedCount)}
        </span>
      )}
      {!photo.originalUploaded && (
        <span className="absolute inset-x-0 bottom-0 bg-ink/60 px-1 py-0.5 text-center text-[10px] leading-tight text-paper">
          {en.tray.savingOriginal}
        </span>
      )}
      {/* Padded to a ~44px touch target; only the inner circle is visible. */}
      <button
        type="button"
        aria-label={en.tray.remove}
        onClick={() => onRemove(photo.id)}
        className="group absolute right-0 top-0 p-2 focus-visible:outline-none"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/60 text-paper transition-colors group-hover:bg-ink/80 group-focus-visible:ring-2 group-focus-visible:ring-terracotta">
          <X size={14} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
