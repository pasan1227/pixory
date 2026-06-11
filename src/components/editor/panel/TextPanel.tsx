"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import { useId } from "react";
import { BOOK_FONTS } from "@/data/book-fonts";
import { en } from "@/i18n/en";
import { BOOK_FONT_IDS, TEXT_ALIGNMENTS } from "@/lib/schemas/book";
import type { BookFontId, TextAlign } from "@/types/book";

export interface TextValue {
  text: string;
  fontId: BookFontId;
  align: TextAlign;
}

type TextPanelProps = Readonly<{
  value: TextValue;
  onChange: (next: TextValue) => void;
}>;

const ALIGN_META: Record<
  TextAlign,
  { label: string; Icon: typeof AlignLeft }
> = {
  left: { label: en.editor.panel.alignLeft, Icon: AlignLeft },
  center: { label: en.editor.panel.alignCenter, Icon: AlignCenter },
  right: { label: en.editor.panel.alignRight, Icon: AlignRight },
};

export function TextPanel({ value, onChange }: TextPanelProps) {
  const fontSelectId = useId();
  const font = BOOK_FONTS[value.fontId];
  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={value.text}
        onChange={(event) => onChange({ ...value, text: event.target.value })}
        placeholder={en.editor.panel.textPlaceholder}
        aria-label={en.editor.panel.text}
        rows={4}
        // Font files load in a later milestone; the fallback stack renders
        // until the CSS variable exists.
        style={{ fontFamily: `var(${font.cssVariable}, ${font.fallback})` }}
        className="w-full resize-y rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-zinc-400 focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor={fontSelectId}
          className="text-xs font-medium text-zinc-600"
        >
          {en.editor.panel.font}
        </label>
        <select
          id={fontSelectId}
          value={value.fontId}
          onChange={(event) =>
            // The option list is built from BOOK_FONT_IDS, so the value is
            // always a valid BookFontId.
            onChange({ ...value, fontId: event.target.value as BookFontId })
          }
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm text-ink focus:border-terracotta focus:outline-none focus:ring-1 focus:ring-terracotta"
        >
          {BOOK_FONT_IDS.map((id) => (
            <option key={id} value={id}>
              {en.fonts[id]}
            </option>
          ))}
        </select>
      </div>
      <div
        role="group"
        aria-label={en.editor.panel.align}
        className="flex gap-1"
      >
        {TEXT_ALIGNMENTS.map((align) => {
          const { label, Icon } = ALIGN_META[align];
          const active = value.align === align;
          return (
            <button
              key={align}
              type="button"
              aria-pressed={active}
              aria-label={label}
              onClick={() => onChange({ ...value, align })}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta ${
                active
                  ? "border-terracotta bg-terracotta/10 text-terracotta-deep"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
