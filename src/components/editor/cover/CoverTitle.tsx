"use client";

import { memo } from "react";
import { en } from "@/i18n/en";
import type { BookCover } from "@/types/book";
import type { CoverBox, CoverLayout } from "@/types/layout";

// Title / subtitle text positioned by a page-normalized cover box. Not
// editable in place (the context panel owns editing) and never interactive —
// pointer events pass through to whatever sits beneath (e.g. a full-bleed
// photo slot). Font size scales with the rendered cover via cqh, so the same
// numbers serve the canvas, thumbnails and previews.

type CoverTitleProps = Readonly<{
  box: CoverBox;
  text: string;
  // Font size as a fraction of cover height (box.h × per-role factor).
  sizeCqh: number;
  colorHex: string;
  fontFamily: string;
  // Placeholder rendering (empty title in interactive mode) dims to 50%.
  dimmed?: boolean;
}>;

function CoverTitleImpl({
  box,
  text,
  sizeCqh,
  colorHex,
  fontFamily,
  dimmed = false,
}: CoverTitleProps) {
  return (
    <div
      className={`pointer-events-none absolute flex items-center justify-center ${
        dimmed ? "opacity-50" : ""
      }`}
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
      }}
    >
      <span
        className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-center"
        style={{
          color: colorHex,
          fontFamily,
          fontSize: `${sizeCqh}cqh`,
          lineHeight: 1.1,
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const CoverTitle = memo(CoverTitleImpl);

// Font size = box.h (fraction of cover height) × factor, in cqh.
const TITLE_SIZE_FACTOR = 55;
const SUBTITLE_SIZE_FACTOR = 45;

type CoverTextLayerProps = Readonly<{
  cover: BookCover;
  layout: CoverLayout;
  // Interactive surfaces show a dimmed placeholder for an empty title;
  // read-only covers stay clean.
  interactive: boolean;
  colorHex: string;
  fontFamily: string;
}>;

// The title + subtitle layer of the front cover.
export function CoverTextLayer({
  cover,
  layout,
  interactive,
  colorHex,
  fontFamily,
}: CoverTextLayerProps) {
  const titlePlaceholder = interactive && cover.title === "";
  const subtitle = cover.subtitle ?? "";
  return (
    <>
      {(cover.title !== "" || titlePlaceholder) && (
        <CoverTitle
          box={layout.titleBox}
          text={titlePlaceholder ? en.editor.cover.titlePlaceholder : cover.title}
          sizeCqh={layout.titleBox.h * TITLE_SIZE_FACTOR}
          colorHex={colorHex}
          fontFamily={fontFamily}
          dimmed={titlePlaceholder}
        />
      )}
      {layout.subtitleBox && subtitle !== "" && (
        <CoverTitle
          box={layout.subtitleBox}
          text={subtitle}
          sizeCqh={layout.subtitleBox.h * SUBTITLE_SIZE_FACTOR}
          colorHex={colorHex}
          fontFamily={fontFamily}
        />
      )}
    </>
  );
}
