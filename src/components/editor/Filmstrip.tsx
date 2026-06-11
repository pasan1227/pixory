"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { memo } from "react";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import { SortableSpreadItem } from "@/components/editor/SortableSpreadItem";
import { en } from "@/i18n/en";
import { spreadBounds } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore } from "@/stores/editor-store";
import type { BookDocument } from "@/types/book";

type CoverFilmstripItemProps = Readonly<{
  document: BookDocument;
  photosById: Record<string, PhotoDto>;
  selected: boolean;
  onSelect: () => void;
}>;

// Read-only cover mini at the head of the strip. Not sortable: the cover has
// a fixed position, so it lives outside the SortableContext's item ids.
//
// Memoized with a custom comparator over exactly the fields its CoverRenderer
// reads (cover, format, spread count). Immer structural sharing in the
// document ops keeps `document.cover` referentially stable across non-cover
// edits, so spread pans and caption keystrokes skip this subtree instead of
// re-rendering the cover thumbnail on every commit. CoverRenderer still
// receives the full document per its pinned contract — the comparator lives
// on this wrapper. `onSelect` is a stable store action, so it is not compared.
const CoverFilmstripItem = memo(
  function CoverFilmstripItem({
    document,
    photosById,
    selected,
    onSelect,
  }: CoverFilmstripItemProps) {
    return (
      <li className="shrink-0">
        <button
          type="button"
          onClick={onSelect}
          aria-label={en.editor.cover.label}
          aria-current={selected ? "true" : undefined}
          className={`flex w-24 flex-col items-center gap-1 rounded-md p-1 transition-shadow duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
            selected ? "ring-2 ring-terracotta" : "hover:ring-2 hover:ring-zinc-300"
          }`}
        >
          <span className="pointer-events-none block w-full select-none overflow-hidden rounded-xs border border-zinc-300">
            <CoverRenderer
              document={document}
              photosById={photosById}
              className="w-full"
            />
          </span>
          <span
            aria-hidden="true"
            className={`text-xs ${selected ? "font-semibold text-ink" : "text-zinc-500"}`}
          >
            {en.editor.cover.label}
          </span>
        </button>
      </li>
    );
  },
  (prev, next) =>
    prev.document.cover === next.document.cover &&
    prev.document.format === next.document.format &&
    prev.document.spreads.length === next.document.spreads.length &&
    prev.photosById === next.photosById &&
    prev.selected === next.selected,
);

// Horizontal strip of the cover plus every spread: click selects, the grip
// handle (pointer, long-press touch, or keyboard) reorders spreads, +
// appends after the selected spread within format bounds. The cover entry is
// fixed first and excluded from reordering.
export function Filmstrip({
  photosById,
}: Readonly<{ photosById: Record<string, PhotoDto> }>) {
  const doc = useEditorStore((s) => s.document);
  const spreads = useEditorStore((s) => s.document.spreads);
  const format = useEditorStore((s) => s.document.format);
  const view = useEditorStore((s) => s.selection.view);
  const rawIndex = useEditorStore((s) => s.selection.spreadIndex);
  const selectCover = useEditorStore((s) => s.selectCover);
  const addSpreadAfter = useEditorStore((s) => s.addSpreadAfter);
  const moveSpread = useEditorStore((s) => s.moveSpread);
  // After undo the persisted selection may exceed the spread count — clamp.
  const selectedIndex = Math.min(rawIndex, spreads.length - 1);

  // Mouse + Touch instead of PointerSensor: pointerdown fires before
  // touchstart, so a registered PointerSensor would capture every touch and
  // the TouchSensor would never activate (dnd-kit ignores activators once a
  // sensor has claimed the interaction) — and pan-x scrolling then cancels
  // the pointer drag. Long-press (250ms) starts a touch reorder; a swipe
  // within the delay still scrolls the strip.
  const sensors = useSensors(
    // Small activation distance so a plain click still selects.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = spreads.map((spread) => spread.id);
  const { minSpreads, maxSpreads } = spreadBounds(format);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    moveSpread(from, to);
  };

  return (
    <div className="shrink-0 border-t border-zinc-200 bg-zinc-50">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
          <ol className="flex items-center gap-2 overflow-x-auto px-3 py-3">
            <CoverFilmstripItem
              document={doc}
              photosById={photosById}
              selected={view === "cover"}
              onSelect={selectCover}
            />
            {spreads.map((spread, index) => (
              // Every prop is a primitive or referentially stable, so the
              // memoized item skips re-rendering for untouched spreads.
              <SortableSpreadItem
                key={spread.id}
                format={format}
                spread={spread}
                photosById={photosById}
                index={index}
                // Selected styling and the remove affordance apply only when
                // the spread view is active — never while the cover is shown.
                selected={view === "spread" && index === selectedIndex}
                removeDisabled={spreads.length <= minSpreads}
              />
            ))}
            <li className="shrink-0 px-1">
              <button
                type="button"
                onClick={() => addSpreadAfter(selectedIndex)}
                disabled={spreads.length >= maxSpreads}
                aria-label={en.editor.addSpread}
                title={en.editor.addSpread}
                className="flex size-11 items-center justify-center rounded-md border border-dashed border-zinc-400 text-zinc-600 transition-colors duration-150 motion-reduce:transition-none hover:border-terracotta hover:text-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:pointer-events-none disabled:opacity-40"
              >
                <Plus className="size-5" aria-hidden="true" />
              </button>
            </li>
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}
