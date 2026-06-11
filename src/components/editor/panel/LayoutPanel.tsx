"use client";

import { SPREAD_LAYOUTS } from "@/data/layouts";
import { en } from "@/i18n/en";
import { spreadAspectRatio } from "@/lib/print-specs";
import type { BookFormat } from "@/types/book";
import type { SlotDef } from "@/types/layout";

// en.layouts is keyed by the layout ids in src/data/layouts.ts; widening to a
// string index lets us label dynamically without duplicating the id list.
const LAYOUT_LABELS: Record<string, string> = en.layouts;

type LayoutPanelProps = Readonly<{
  format: BookFormat;
  currentLayoutId: string;
  onSelect: (layoutId: string) => void;
}>;

// Schematic slot rect inside a layout mini. x/w are fractions of the spread
// width and y/h of the page height — exactly the mini's axes, so the
// normalized rect maps straight to percentages.
function MiniSlot({ slot }: Readonly<{ slot: SlotDef }>) {
  const style = {
    left: `${slot.x * 100}%`,
    top: `${slot.y * 100}%`,
    width: `${slot.w * 100}%`,
    height: `${slot.h * 100}%`,
  };
  if (slot.type === "text") {
    return (
      <span
        className="absolute flex items-center justify-center bg-zinc-200"
        style={style}
      >
        <span className="h-0.5 w-2/3 rounded-full bg-zinc-400" />
      </span>
    );
  }
  return <span className="absolute bg-zinc-300" style={style} />;
}

export function LayoutPanel({
  format,
  currentLayoutId,
  onSelect,
}: LayoutPanelProps) {
  const aspectRatio = String(spreadAspectRatio(format));
  return (
    <ul className="grid grid-cols-2 gap-2">
      {SPREAD_LAYOUTS.map((layout) => {
        const isCurrent = layout.id === currentLayoutId;
        return (
          <li key={layout.id}>
            <button
              type="button"
              aria-label={LAYOUT_LABELS[layout.id]}
              aria-pressed={isCurrent}
              onClick={() => onSelect(layout.id)}
              style={{ aspectRatio }}
              className={`relative block w-full overflow-hidden rounded-md bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                isCurrent
                  ? "ring-2 ring-terracotta"
                  : "ring-1 ring-zinc-200 hover:ring-zinc-400"
              }`}
            >
              {/* Gutter hint; full-bleed slots intentionally cover it. */}
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-1/2 w-px bg-zinc-200"
              />
              {layout.slots.map((slot, index) => (
                // Layout slot lists are static design data and never
                // reorder, so the index is a stable key.
                <MiniSlot key={index} slot={slot} />
              ))}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
