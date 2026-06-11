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
import { SortableSpreadItem } from "@/components/editor/SortableSpreadItem";
import { en } from "@/i18n/en";
import { spreadBounds } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore } from "@/stores/editor-store";

// Horizontal strip of every spread: click selects, the grip handle (pointer,
// long-press touch, or keyboard) reorders, + appends after the selected
// spread within format bounds.
export function Filmstrip({
  photosById,
}: Readonly<{ photosById: Record<string, PhotoDto> }>) {
  const spreads = useEditorStore((s) => s.document.spreads);
  const format = useEditorStore((s) => s.document.format);
  const rawIndex = useEditorStore((s) => s.selection.spreadIndex);
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
            {spreads.map((spread, index) => (
              // Every prop is a primitive or referentially stable, so the
              // memoized item skips re-rendering for untouched spreads.
              <SortableSpreadItem
                key={spread.id}
                format={format}
                spread={spread}
                photosById={photosById}
                index={index}
                selected={index === selectedIndex}
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
