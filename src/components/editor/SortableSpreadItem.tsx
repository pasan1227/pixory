"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { memo, useCallback } from "react";
import { SpreadThumbnail } from "@/components/editor/SpreadThumbnail";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore } from "@/stores/editor-store";
import type { BookFormat, Spread } from "@/types/book";

type SortableSpreadItemProps = Readonly<{
  format: BookFormat;
  spread: Spread;
  photosById: Record<string, PhotoDto>;
  index: number;
  selected: boolean;
  removeDisabled: boolean;
}>;

// One filmstrip entry. Memoized so panning/typing in one spread doesn't
// re-render every thumbnail: all props are primitives or referentially stable
// (`spread` keeps its identity for untouched spreads thanks to immer
// structural sharing in document-ops; `photosById` is memoized upstream).
// Handlers are derived HERE from the index + zustand actions (stable for the
// store's lifetime) instead of being fresh closures passed down by Filmstrip.
export const SortableSpreadItem = memo(function SortableSpreadItem({
  format,
  spread,
  photosById,
  index,
  selected,
  removeDisabled,
}: SortableSpreadItemProps) {
  const selectSpread = useEditorStore((s) => s.selectSpread);
  const removeSpread = useEditorStore((s) => s.removeSpread);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: spread.id });

  const handleSelect = useCallback(
    () => selectSpread(index),
    [selectSpread, index],
  );
  const handleRemove = useCallback(
    () => removeSpread(index),
    [removeSpread, index],
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // touch-pan-x keeps the strip swipe-scrollable on mobile; the drag
      // handle below is touch-none, so drags starting there always reorder.
      className={`relative shrink-0 touch-pan-x select-none ${isDragging ? "z-10 opacity-80" : ""}`}
    >
      <SpreadThumbnail
        format={format}
        spread={spread}
        photosById={photosById}
        index={index}
        selected={selected}
        onSelect={handleSelect}
      />
      {/* Dedicated drag handle (pointer + keyboard sortable activator).
          44px hit area around a small visual disc (padding trick). */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={en.editor.reorderHint}
        title={en.editor.reorderHint}
        className="group absolute -top-2 -left-2 z-10 flex size-11 cursor-grab touch-none items-center justify-center focus-visible:outline-none"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-ink text-paper shadow-sm group-focus-visible:ring-2 group-focus-visible:ring-terracotta">
          <GripVertical className="size-3" aria-hidden="true" />
        </span>
      </button>
      {selected && (
        // 44px hit area around a small visual disc (padding trick).
        <button
          type="button"
          onClick={handleRemove}
          disabled={removeDisabled}
          aria-label={en.editor.removeSpread}
          title={en.editor.removeSpread}
          className="group absolute -top-2 -right-2 z-10 flex size-11 items-center justify-center focus-visible:outline-none disabled:opacity-40"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-ink text-paper shadow-sm group-focus-visible:ring-2 group-focus-visible:ring-terracotta">
            <X className="size-3" aria-hidden="true" />
          </span>
        </button>
      )}
    </li>
  );
});
