"use client";

import { memo } from "react";
import { BOOK_FONTS } from "@/data/book-fonts";
import type { TextContent } from "@/types/book";
import type { SlotDef } from "@/types/layout";

// Text placed in a slot. Font files load in a later milestone — the CSS
// variable falls back to the curated system stack until then.

type TextSlotContentProps = Readonly<{
  rect: SlotDef;
  content: TextContent;
}>;

function TextSlotContentImpl({ rect, content }: TextSlotContentProps) {
  const font = BOOK_FONTS[content.fontId];
  return (
    <div
      className="absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-ink"
      style={{
        fontFamily: `var(${font.cssVariable}, ${font.fallback})`,
        textAlign: content.align,
        // 30% of the slot's height, expressed in container-query units of the
        // spread box (rect.h is the slot height as a fraction of it) — the
        // text scales with the rendered spread, never a fixed pixel size.
        fontSize: `${rect.h * 30}cqh`,
        lineHeight: 1.3,
      }}
    >
      {content.text}
    </div>
  );
}

export const TextSlotContent = memo(TextSlotContentImpl);
