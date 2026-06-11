"use client";

import { memo } from "react";
import { SpreadRenderer } from "@/components/editor/spread/SpreadRenderer";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookFormat, Spread } from "@/types/book";

type SpreadThumbnailProps = Readonly<{
  format: BookFormat;
  spread: Spread;
  photosById: Record<string, PhotoDto>;
  index: number;
  selected: boolean;
  onSelect: () => void;
}>;

// Read-only miniature of one spread for the filmstrip — the same renderer as
// the canvas, just without callbacks or badges. Memoized so the expensive
// SpreadRenderer is skipped when only sibling spreads change: every prop is
// a primitive or referentially stable (`spread` via immer structural
// sharing, `onSelect` via useCallback in SortableSpreadItem).
export const SpreadThumbnail = memo(function SpreadThumbnail({
  format,
  spread,
  photosById,
  index,
  selected,
  onSelect,
}: SpreadThumbnailProps) {
  const label = en.editor.spreadLabel.replace("{n}", String(index + 1));
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={selected ? "true" : undefined}
      className={`flex w-24 flex-col items-center gap-1 rounded-md p-1 transition-shadow duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
        selected ? "ring-2 ring-terracotta" : "hover:ring-2 hover:ring-zinc-300"
      }`}
    >
      <span className="pointer-events-none block w-full select-none overflow-hidden rounded-xs border border-zinc-300">
        <SpreadRenderer
          format={format}
          spread={spread}
          photosById={photosById}
          showBadges={false}
          className="w-full"
        />
      </span>
      <span
        aria-hidden="true"
        className={`text-xs ${selected ? "font-semibold text-ink" : "text-zinc-500"}`}
      >
        {index + 1}
      </span>
    </button>
  );
});
