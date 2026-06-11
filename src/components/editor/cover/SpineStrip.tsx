"use client";

import { memo } from "react";

// The book spine, rendered flush left of the front cover when the page count
// makes spine text printable. Purely decorative on screen — the readable
// title lives on the front cover, so the strip is aria-hidden. Hex colors are
// book content (cover stock), passed through inline style by design.

type SpineStripProps = Readonly<{
  text: string;
  bgHex: string;
  textHex: string;
  fontFamily: string;
}>;

function SpineStripImpl({ text, bgHex, textHex, fontFamily }: SpineStripProps) {
  return (
    <div
      aria-hidden
      className="flex w-[5%] shrink-0 items-center justify-center overflow-hidden rounded-l-sm shadow"
      style={{
        backgroundColor: bgHex,
        // Subtle seam between spine and front cover, readable on any stock.
        borderRight: `1px solid ${textHex}33`,
        // cqw below resolves against the spine strip itself.
        containerType: "size",
      }}
    >
      <span
        className="max-h-[90%] overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          writingMode: "vertical-rl",
          color: textHex,
          fontFamily,
          // Glyph em-size runs across the spine width in vertical-rl.
          fontSize: "55cqw",
          lineHeight: 1,
        }}
      >
        {text}
      </span>
    </div>
  );
}

export const SpineStrip = memo(SpineStripImpl);
