"use client";

import { useMemo, useState } from "react";
import { CoverLayoutStep, FormatStep } from "@/components/create/SelectionSteps";
import {
  ColorStep,
  CoverTextFields,
  FontStep,
} from "@/components/create/StyleSteps";
import { NO_PHOTOS, sampleCover } from "@/components/create/create-shared";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import { DEFAULT_COVER_LAYOUT_ID } from "@/data/layouts";
import { en } from "@/i18n/en";
import { createBookAction } from "@/server/actions/books";
import type {
  BookFontId,
  BookFormat,
  CoverColorId,
  CoverTextStyle,
} from "@/types/book";

const EMPTY_STYLE: CoverTextStyle = {
  bold: false,
  italic: false,
  underline: false,
};

// Compact flag string posted to createBookAction (e.g. "bu" = bold+underline).
function styleFlag(style: CoverTextStyle): string {
  return `${style.bold ? "b" : ""}${style.italic ? "i" : ""}${style.underline ? "u" : ""}`;
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

// The /create client island: pick format, cover style, colour, font and cover
// text with a live cover preview, then submit the choices to createBookAction.
// Selection is plain local state; prices shown are the static base prices from
// the single pricing source — never recomputed.
export function CreateBookForm() {
  const [format, setFormat] = useState<BookFormat>("square_20");
  const [coverLayout, setCoverLayout] = useState<string>(DEFAULT_COVER_LAYOUT_ID);
  const [coverColor, setCoverColor] = useState<CoverColorId>("terracotta");
  const [coverFont, setCoverFont] = useState<BookFontId>("fraunces");
  const [title, setTitle] = useState<string>("");
  const [subtitle, setSubtitle] = useState<string>("");
  const [titleStyle, setTitleStyle] = useState<CoverTextStyle>(EMPTY_STYLE);
  const [subtitleStyle, setSubtitleStyle] =
    useState<CoverTextStyle>(EMPTY_STYLE);

  const previewDocument = useMemo(
    () =>
      sampleCover({
        format,
        layoutId: coverLayout,
        colorId: coverColor,
        fontId: coverFont,
        title,
        subtitle,
        titleStyle,
        subtitleStyle,
      }),
    [
      format,
      coverLayout,
      coverColor,
      coverFont,
      title,
      subtitle,
      titleStyle,
      subtitleStyle,
    ],
  );

  return (
    <form
      action={createBookAction}
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start lg:gap-14"
    >
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="coverLayout" value={coverLayout} />
      <input type="hidden" name="coverColor" value={coverColor} />
      <input type="hidden" name="coverFont" value={coverFont} />
      <input type="hidden" name="titleStyleFlag" value={styleFlag(titleStyle)} />
      <input
        type="hidden"
        name="subtitleStyleFlag"
        value={styleFlag(subtitleStyle)}
      />

      <div className="flex flex-col gap-10">
        <StepSection title={en.create.formatStep}>
          <FormatStep value={format} onChange={setFormat} />
        </StepSection>
        <StepSection title={en.create.coverStep}>
          <CoverLayoutStep
            format={format}
            colorId={coverColor}
            fontId={coverFont}
            value={coverLayout}
            onChange={setCoverLayout}
          />
        </StepSection>
        <StepSection title={en.create.colorStep}>
          <ColorStep value={coverColor} onChange={setCoverColor} />
        </StepSection>
        <StepSection title={en.create.fontStep}>
          <FontStep value={coverFont} onChange={setCoverFont} />
        </StepSection>
        <StepSection title={en.create.detailsStep}>
          <CoverTextFields
            title={title}
            subtitle={subtitle}
            titleStyle={titleStyle}
            subtitleStyle={subtitleStyle}
            onTitleChange={setTitle}
            onSubtitleChange={setSubtitle}
            onTitleStyleChange={setTitleStyle}
            onSubtitleStyleChange={setSubtitleStyle}
          />
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
