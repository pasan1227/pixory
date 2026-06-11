"use client";

import { useMemo, useState } from "react";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import { COVER_COLORS } from "@/data/cover-colors";
import { COVER_LAYOUTS, DEFAULT_COVER_LAYOUT_ID } from "@/data/layouts";
import { en } from "@/i18n/en";
import { switchCoverLayout, updateCoverStyle } from "@/lib/cover-ops";
import { formatLKR } from "@/lib/format";
import { createEmptyBookDocument } from "@/lib/new-book";
import { FORMAT_PRICING } from "@/lib/pricing";
import { PRINT_SPECS } from "@/lib/print-specs";
import { BOOK_FORMATS, COVER_COLOR_IDS } from "@/lib/schemas/book";
import type { PhotoDto } from "@/lib/schemas/photo";
import { createBookAction } from "@/server/actions/books";
import type { BookDocument, BookFormat, CoverColorId } from "@/types/book";

// Stable empty map — the create flow previews covers before any photo exists.
const NO_PHOTOS: Record<string, PhotoDto> = {};

// Sample document for previews: pure document ops on a fresh empty book, with
// a legible placeholder title. Never persisted — the server action builds the
// real document from the submitted fields.
function sampleCover(
  format: BookFormat,
  layoutId: string,
  colorId: CoverColorId,
): BookDocument {
  return updateCoverStyle(
    switchCoverLayout(createEmptyBookDocument(format), layoutId),
    { colorId, title: en.create.preview },
  );
}

function coverLayoutLabel(id: string): string {
  return id in en.coverLayouts
    ? en.coverLayouts[id as keyof typeof en.coverLayouts]
    : id;
}

// ---------------------------------------------------------------------------
// ARIA radio pattern helpers shared by the three steps: roving tabindex (the
// selected option is the single tab stop — the first option when none is
// selected) and arrow keys that move BOTH selection and focus, wrapping.
// ---------------------------------------------------------------------------

const ARROW_KEY_OFFSETS: Readonly<Record<string, 1 | -1>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

function radioTabIndex(index: number, selectedIndex: number): 0 | -1 {
  return index === Math.max(selectedIndex, 0) ? 0 : -1;
}

function moveRadioSelection<T>(
  event: React.KeyboardEvent<HTMLElement>,
  options: readonly T[],
  selectedIndex: number,
  onChange: (option: T) => void,
): void {
  const offset = ARROW_KEY_OFFSETS[event.key];
  if (offset === undefined || options.length === 0) return;
  event.preventDefault();
  const from = Math.max(selectedIndex, 0);
  const nextIndex = (from + offset + options.length) % options.length;
  const next = options[nextIndex];
  if (next === undefined) return;
  onChange(next);
  // Focus follows selection: the radios sit in DOM order inside the
  // enclosing radiogroup, matching the options order.
  event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    [nextIndex]?.focus();
}

const cardBase =
  "rounded-xl border bg-white text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

function cardSelected(selected: boolean): string {
  return selected
    ? "border-terracotta ring-1 ring-terracotta"
    : "border-sand hover:border-terracotta";
}

function StepSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-ink/60 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function FormatStep({
  value,
  onChange,
}: Readonly<{ value: BookFormat; onChange: (format: BookFormat) => void }>) {
  const selectedIndex = BOOK_FORMATS.indexOf(value);
  return (
    <div role="radiogroup" aria-label={en.create.formatStep} className="flex flex-col gap-3">
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

function CoverStep({
  format,
  colorId,
  value,
  onChange,
}: Readonly<{
  format: BookFormat;
  colorId: CoverColorId;
  value: string;
  onChange: (layoutId: string) => void;
}>) {
  const minis = useMemo(
    () =>
      COVER_LAYOUTS.map((layout) => ({
        id: layout.id,
        document: sampleCover(format, layout.id, colorId),
      })),
    [format, colorId],
  );
  const layoutIds = useMemo(() => minis.map((mini) => mini.id), [minis]);
  const selectedIndex = layoutIds.indexOf(value);
  return (
    <div role="radiogroup" aria-label={en.create.coverStep} className="grid grid-cols-3 gap-3">
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

function ColorStep({
  value,
  onChange,
}: Readonly<{ value: CoverColorId; onChange: (colorId: CoverColorId) => void }>) {
  const selectedIndex = COVER_COLOR_IDS.indexOf(value);
  return (
    <div role="radiogroup" aria-label={en.create.colorStep} className="flex flex-wrap gap-3">
      {COVER_COLOR_IDS.map((id, index) => {
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={en.coverColors[id]}
            title={en.coverColors[id]}
            tabIndex={radioTabIndex(index, selectedIndex)}
            onKeyDown={(event) =>
              moveRadioSelection(event, COVER_COLOR_IDS, selectedIndex, onChange)
            }
            onClick={() => onChange(id)}
            className={`h-11 w-11 rounded-full border border-ink/10 transition-shadow duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
              selected ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""
            }`}
            style={{ backgroundColor: COVER_COLORS[id].hex }}
          />
        );
      })}
    </div>
  );
}

// The /create client island: pick format, cover layout and cover color with a
// live cover preview, then submit the choices to createBookAction. Selection
// is plain local state; prices shown are the static base prices from the
// single pricing source — never recomputed.
export function CreateBookForm() {
  const [format, setFormat] = useState<BookFormat>("square_20");
  const [coverLayout, setCoverLayout] = useState<string>(DEFAULT_COVER_LAYOUT_ID);
  const [coverColor, setCoverColor] = useState<CoverColorId>("terracotta");

  const previewDocument = useMemo(
    () => sampleCover(format, coverLayout, coverColor),
    [format, coverLayout, coverColor],
  );

  return (
    <form
      action={createBookAction}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-14"
    >
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="coverLayout" value={coverLayout} />
      <input type="hidden" name="coverColor" value={coverColor} />

      <div className="flex flex-col gap-10">
        <StepSection title={en.create.formatStep}>
          <FormatStep value={format} onChange={setFormat} />
        </StepSection>
        <StepSection title={en.create.coverStep}>
          <CoverStep
            format={format}
            colorId={coverColor}
            value={coverLayout}
            onChange={setCoverLayout}
          />
        </StepSection>
        <StepSection title={en.create.colorStep}>
          <ColorStep value={coverColor} onChange={setCoverColor} />
        </StepSection>
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-terracotta px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none sm:w-auto sm:self-start"
        >
          {en.create.cta}
        </button>
      </div>

      <aside
        aria-label={en.create.preview}
        className="order-first mx-auto w-full max-w-xs lg:sticky lg:top-8 lg:order-none lg:max-w-none"
      >
        <div className="overflow-hidden rounded-lg shadow-xl shadow-ink/15">
          <CoverRenderer
            document={previewDocument}
            photosById={NO_PHOTOS}
            showSpine={false}
            showBadges={false}
            className="w-full"
          />
        </div>
      </aside>
    </form>
  );
}
