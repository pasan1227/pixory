"use client";

import {
  cardBase,
  cardSelected,
  moveRadioSelection,
  radioTabIndex,
} from "@/components/create/create-shared";
import { BOOK_FONTS } from "@/data/book-fonts";
import { COVER_COLORS } from "@/data/cover-colors";
import { en } from "@/i18n/en";
import { BOOK_FONT_IDS, COVER_COLOR_IDS } from "@/lib/schemas/book";
import type { BookFontId, CoverColorId, CoverTextStyle } from "@/types/book";

const INPUT_CLASS =
  "min-h-11 rounded-xl border border-sand bg-white px-4 py-2.5 text-ink placeholder:text-ink/40 focus-visible:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

const TOGGLE_BASE =
  "flex h-11 w-11 items-center justify-center rounded-md border text-base transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

function toggleClass(active: boolean): string {
  return active
    ? "border-terracotta bg-terracotta text-paper"
    : "border-sand bg-white text-ink hover:border-terracotta";
}

export function ColorStep({
  value,
  onChange,
}: Readonly<{ value: CoverColorId; onChange: (colorId: CoverColorId) => void }>) {
  const selectedIndex = COVER_COLOR_IDS.indexOf(value);
  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label={en.create.colorStep}
        className="flex flex-wrap gap-3"
      >
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
              // Cover colour hexes are book content (printed cover stock), not UI
              // chrome — inline style is the sanctioned path. Patterned finishes
              // preview their CSS layers over the base colour.
              style={{
                backgroundColor: COVER_COLORS[id].hex,
                ...COVER_COLORS[id].pattern,
              }}
            />
          );
        })}
      </div>
      <p aria-live="polite" className="text-sm text-ink/60">
        {en.coverColors[value]}
      </p>
    </div>
  );
}

export function FontStep({
  value,
  onChange,
}: Readonly<{ value: BookFontId; onChange: (fontId: BookFontId) => void }>) {
  const selectedIndex = BOOK_FONT_IDS.indexOf(value);
  return (
    <div
      role="radiogroup"
      aria-label={en.create.fontStep}
      className="grid grid-cols-2 gap-3"
    >
      {BOOK_FONT_IDS.map((id, index) => {
        const font = BOOK_FONTS[id];
        const selected = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={radioTabIndex(index, selectedIndex)}
            onKeyDown={(event) =>
              moveRadioSelection(event, BOOK_FONT_IDS, selectedIndex, onChange)
            }
            onClick={() => onChange(id)}
            // The fonts load via the /create route layout; this previews each
            // typeface in its own face, falling back gracefully.
            style={{ fontFamily: `var(${font.cssVariable}), ${font.fallback}` }}
            className={`${cardBase} ${cardSelected(selected)} min-h-11 px-4 py-3 text-lg text-ink`}
          >
            {en.fonts[id]}
          </button>
        );
      })}
    </div>
  );
}

function StyleToggles({
  value,
  onChange,
}: Readonly<{
  value: CoverTextStyle;
  onChange: (style: CoverTextStyle) => void;
}>) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label={en.textStyle.bold}
        aria-pressed={value.bold}
        onClick={() => onChange({ ...value, bold: !value.bold })}
        className={`${TOGGLE_BASE} font-bold ${toggleClass(value.bold)}`}
      >
        B
      </button>
      <button
        type="button"
        aria-label={en.textStyle.italic}
        aria-pressed={value.italic}
        onClick={() => onChange({ ...value, italic: !value.italic })}
        className={`${TOGGLE_BASE} italic ${toggleClass(value.italic)}`}
      >
        I
      </button>
      <button
        type="button"
        aria-label={en.textStyle.underline}
        aria-pressed={value.underline}
        onClick={() => onChange({ ...value, underline: !value.underline })}
        className={`${TOGGLE_BASE} underline ${toggleClass(value.underline)}`}
      >
        U
      </button>
    </div>
  );
}

function CoverTextField({
  label,
  name,
  value,
  maxLength,
  placeholder,
  style,
  onValueChange,
  onStyleChange,
}: Readonly<{
  label: string;
  name: string;
  value: string;
  maxLength: number;
  placeholder: string;
  style: CoverTextStyle;
  onValueChange: (value: string) => void;
  onStyleChange: (style: CoverTextStyle) => void;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink/70">
        {label}
        <input
          type="text"
          name={name}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => onValueChange(event.target.value)}
          className={`${INPUT_CLASS} font-normal`}
        />
      </label>
      <StyleToggles value={style} onChange={onStyleChange} />
    </div>
  );
}

export function CoverTextFields({
  title,
  subtitle,
  titleStyle,
  subtitleStyle,
  onTitleChange,
  onSubtitleChange,
  onTitleStyleChange,
  onSubtitleStyleChange,
}: Readonly<{
  title: string;
  subtitle: string;
  titleStyle: CoverTextStyle;
  subtitleStyle: CoverTextStyle;
  onTitleChange: (value: string) => void;
  onSubtitleChange: (value: string) => void;
  onTitleStyleChange: (style: CoverTextStyle) => void;
  onSubtitleStyleChange: (style: CoverTextStyle) => void;
}>) {
  return (
    <div className="flex flex-col gap-4">
      <CoverTextField
        label={en.create.titleLabel}
        name="coverTitle"
        value={title}
        maxLength={120}
        placeholder={en.create.titlePlaceholder}
        style={titleStyle}
        onValueChange={onTitleChange}
        onStyleChange={onTitleStyleChange}
      />
      <CoverTextField
        label={en.create.subtitleLabel}
        name="coverSubtitle"
        value={subtitle}
        maxLength={160}
        placeholder={en.create.subtitlePlaceholder}
        style={subtitleStyle}
        onValueChange={onSubtitleChange}
        onStyleChange={onSubtitleStyleChange}
      />
    </div>
  );
}
