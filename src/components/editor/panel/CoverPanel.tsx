"use client";

import { BOOK_FONTS } from "@/data/book-fonts";
import { COVER_COLORS } from "@/data/cover-colors";
import { COVER_LAYOUTS } from "@/data/layouts";
import { en } from "@/i18n/en";
import { PAGES_PER_SPREAD, PRINT_SPECS } from "@/lib/print-specs";
import { BOOK_FONT_IDS, COVER_COLOR_IDS } from "@/lib/schemas/book";
import { useEditorStore } from "@/stores/editor-store";
import type { BookFontId, BookFormat, CoverColorId } from "@/types/book";
import type { CoverBox } from "@/types/layout";

// en.coverLayouts is keyed by the layout ids in src/data/layouts.ts; widening
// to a string index lets us label dynamically without duplicating the id list.
const COVER_LAYOUT_LABELS: Record<string, string> = en.coverLayouts;

const INPUT_CLASS =
  "min-h-11 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-ink placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta";
const GROUP_LABEL_CLASS = "text-xs font-medium text-zinc-600";

function CoverField({
  label,
  value,
  placeholder,
  hint,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  placeholder?: string;
  hint?: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className={`flex flex-col gap-1.5 ${GROUP_LABEL_CLASS}`}>
      {label}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
      {hint && <span className="font-normal text-zinc-500">{hint}</span>}
    </label>
  );
}

function FontPicker({
  value,
  onChange,
}: Readonly<{ value: BookFontId; onChange: (fontId: BookFontId) => void }>) {
  return (
    <div role="group" aria-label={en.editor.cover.font} className="flex flex-col gap-1.5">
      <span className={GROUP_LABEL_CLASS}>{en.editor.cover.font}</span>
      <div className="grid grid-cols-2 gap-2">
        {BOOK_FONT_IDS.map((id) => {
          const font = BOOK_FONTS[id];
          const active = id === value;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              // Each option previews its own typeface; the variables are
              // exposed by the (editor) layout's next/font setup.
              style={{ fontFamily: `var(${font.cssVariable}), ${font.fallback}` }}
              className={`min-h-11 rounded-md bg-white px-3 py-2 text-sm text-ink transition-shadow duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                active
                  ? "ring-2 ring-terracotta"
                  : "ring-1 ring-zinc-200 hover:ring-zinc-400"
              }`}
            >
              {en.fonts[id]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
}: Readonly<{
  value: CoverColorId;
  onChange: (colorId: CoverColorId) => void;
}>) {
  return (
    <div role="group" aria-label={en.editor.cover.color} className="flex flex-col gap-1.5">
      <span className={GROUP_LABEL_CLASS}>{en.editor.cover.color}</span>
      <div className="flex flex-wrap gap-0.5">
        {COVER_COLOR_IDS.map((id) => {
          const active = id === value;
          return (
            // 44px hit area around a smaller visual swatch (padding trick).
            <button
              key={id}
              type="button"
              aria-label={en.coverColors[id]}
              title={en.coverColors[id]}
              aria-pressed={active}
              onClick={() => onChange(id)}
              className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
            >
              <span
                aria-hidden="true"
                // Cover color hexes are book content (printed cover stock),
                // not UI chrome — inline style is the sanctioned path.
                style={{ backgroundColor: COVER_COLORS[id].hex }}
                className={`block size-8 rounded-full border border-ink/10 ${
                  active ? "ring-2 ring-terracotta ring-offset-2" : ""
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Schematic box inside a cover layout mini. Cover rects are normalized to the
// front cover page, which is exactly the mini's box — they map straight to
// percentages.
function MiniBox({
  box,
  kind,
}: Readonly<{ box: CoverBox; kind: "photo" | "title" }>) {
  const style = {
    left: `${box.x * 100}%`,
    top: `${box.y * 100}%`,
    width: `${box.w * 100}%`,
    height: `${box.h * 100}%`,
  };
  if (kind === "title") {
    return (
      <span className="absolute flex items-center justify-center" style={style}>
        <span className="h-0.5 w-2/3 rounded-full bg-zinc-400" />
      </span>
    );
  }
  return <span className="absolute bg-zinc-300" style={style} />;
}

function CoverLayoutPicker({
  format,
  currentLayoutId,
  onSelect,
}: Readonly<{
  format: BookFormat;
  currentLayoutId: string;
  onSelect: (layoutId: string) => void;
}>) {
  const spec = PRINT_SPECS[format];
  const aspectRatio = String(spec.pageWidthMm / spec.pageHeightMm);
  return (
    <div role="group" aria-label={en.editor.cover.layout} className="flex flex-col gap-1.5">
      <span className={GROUP_LABEL_CLASS}>{en.editor.cover.layout}</span>
      <ul className="grid grid-cols-3 gap-2">
        {COVER_LAYOUTS.map((layout) => {
          const isCurrent = layout.id === currentLayoutId;
          return (
            <li key={layout.id}>
              <button
                type="button"
                aria-label={COVER_LAYOUT_LABELS[layout.id]}
                title={COVER_LAYOUT_LABELS[layout.id]}
                aria-pressed={isCurrent}
                onClick={() => onSelect(layout.id)}
                style={{ aspectRatio }}
                className={`relative block w-full overflow-hidden rounded-md bg-white transition-shadow duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                  isCurrent
                    ? "ring-2 ring-terracotta"
                    : "ring-1 ring-zinc-200 hover:ring-zinc-400"
                }`}
              >
                {layout.photoSlots.map((box, index) => (
                  // Layout slot lists are static design data and never
                  // reorder, so the index is a stable key.
                  <MiniBox key={index} box={box} kind="photo" />
                ))}
                <MiniBox box={layout.titleBox} kind="title" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Cover style editing: title/subtitle/spine text, typeface, cover color and
// cover layout. All writes go through the store's pure cover ops.
export function CoverPanel() {
  const cover = useEditorStore((s) => s.document.cover);
  const format = useEditorStore((s) => s.document.format);
  const spreadCount = useEditorStore((s) => s.document.spreads.length);
  const updateCoverStyle = useEditorStore((s) => s.updateCoverStyle);
  const switchCoverLayout = useEditorStore((s) => s.switchCoverLayout);

  const pageCount = spreadCount * PAGES_PER_SPREAD;
  const spineTextAvailable = pageCount > PRINT_SPECS[format].spineTextMinPages;

  return (
    <div className="flex flex-col gap-4">
      <CoverField
        label={en.editor.cover.title}
        value={cover.title}
        placeholder={en.editor.cover.titlePlaceholder}
        onChange={(title) => updateCoverStyle({ title })}
      />
      <CoverField
        label={en.editor.cover.subtitle}
        value={cover.subtitle ?? ""}
        placeholder={en.editor.cover.subtitlePlaceholder}
        onChange={(subtitle) => updateCoverStyle({ subtitle })}
      />
      {spineTextAvailable && (
        <CoverField
          label={en.editor.cover.spineText}
          value={cover.spineText ?? ""}
          hint={en.editor.cover.spineHint}
          onChange={(spineText) => updateCoverStyle({ spineText })}
        />
      )}
      <FontPicker
        value={cover.fontId}
        onChange={(fontId) => updateCoverStyle({ fontId })}
      />
      <ColorPicker
        value={cover.colorId}
        onChange={(colorId) => updateCoverStyle({ colorId })}
      />
      <CoverLayoutPicker
        format={format}
        currentLayoutId={cover.layoutId}
        onSelect={switchCoverLayout}
      />
    </div>
  );
}
