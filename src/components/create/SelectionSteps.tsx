"use client";

import { useMemo } from "react";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import {
  cardBase,
  cardSelected,
  coverLayoutLabel,
  moveRadioSelection,
  NO_PHOTOS,
  radioTabIndex,
  sampleCover,
} from "@/components/create/create-shared";
import { COVER_LAYOUTS } from "@/data/layouts";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import { FORMAT_PRICING } from "@/lib/pricing";
import { PRINT_SPECS } from "@/lib/print-specs";
import { BOOK_FORMATS } from "@/lib/schemas/book";
import type { BookFontId, BookFormat, CoverColorId } from "@/types/book";

export function FormatStep({
  value,
  onChange,
}: Readonly<{ value: BookFormat; onChange: (format: BookFormat) => void }>) {
  const selectedIndex = BOOK_FORMATS.indexOf(value);
  return (
    <div
      role="radiogroup"
      aria-label={en.create.formatStep}
      className="flex flex-col gap-3"
    >
      {BOOK_FORMATS.map((format, index) => {
        const spec = PRINT_SPECS[format];
        const pricing = FORMAT_PRICING[format];
        const selected = format === value;
        return (
          <button
            key={format}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={radioTabIndex(index, selectedIndex)}
            onKeyDown={(event) =>
              moveRadioSelection(event, BOOK_FORMATS, selectedIndex, onChange)
            }
            onClick={() => onChange(format)}
            className={`${cardBase} ${cardSelected(selected)} flex min-h-11 flex-col gap-1 px-5 py-4`}
          >
            <span className="flex w-full items-baseline justify-between gap-3">
              <span className="font-display text-lg font-semibold">
                {en.formats[format]}
              </span>
              <span className="text-sm text-ink/60">
                {en.create.sizeLabel
                  .replace("{w}", String(spec.pageWidthMm / 10))
                  .replace("{h}", String(spec.pageHeightMm / 10))}
              </span>
            </span>
            <span className="flex w-full items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-terracotta-deep">
                {en.create.fromPrice.replace(
                  "{price}",
                  formatLKR(pricing.basePrice),
                )}
              </span>
              <span className="text-ink/60">
                {en.create.includedPages
                  .replace("{count}", String(pricing.includedPages))
                  .replace("{max}", String(spec.maxPages))}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CoverLayoutStep({
  format,
  colorId,
  fontId,
  value,
  onChange,
}: Readonly<{
  format: BookFormat;
  colorId: CoverColorId;
  fontId: BookFontId;
  value: string;
  onChange: (layoutId: string) => void;
}>) {
  // Minis track the chosen colour and font but stay on the placeholder title —
  // keeping per-keystroke work to the single big preview, not six renderers.
  const minis = useMemo(
    () =>
      COVER_LAYOUTS.map((layout) => ({
        id: layout.id,
        document: sampleCover({ format, layoutId: layout.id, colorId, fontId }),
      })),
    [format, colorId, fontId],
  );
  const layoutIds = useMemo(() => minis.map((mini) => mini.id), [minis]);
  const selectedIndex = layoutIds.indexOf(value);
  return (
    <div
      role="radiogroup"
      aria-label={en.create.coverStep}
      className="grid grid-cols-3 gap-3"
    >
      {minis.map((mini, index) => {
        const selected = mini.id === value;
        return (
          <button
            key={mini.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={coverLayoutLabel(mini.id)}
            tabIndex={radioTabIndex(index, selectedIndex)}
            onKeyDown={(event) =>
              moveRadioSelection(event, layoutIds, selectedIndex, onChange)
            }
            onClick={() => onChange(mini.id)}
            className={`${cardBase} ${cardSelected(selected)} flex min-h-11 flex-col items-center gap-1.5 p-2`}
          >
            <span className="pointer-events-none block w-full overflow-hidden rounded-md select-none">
              <CoverRenderer
                document={mini.document}
                photosById={NO_PHOTOS}
                showSpine={false}
                showBadges={false}
                className="w-full"
              />
            </span>
            <span
              aria-hidden="true"
              className={`text-xs ${selected ? "font-semibold text-ink" : "text-ink/60"}`}
            >
              {coverLayoutLabel(mini.id)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
