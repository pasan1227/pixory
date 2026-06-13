import type React from "react";
import { en } from "@/i18n/en";
import { switchCoverLayout, updateCoverStyle } from "@/lib/cover-ops";
import { createEmptyBookDocument } from "@/lib/new-book";
import type { PhotoDto } from "@/lib/schemas/photo";
import type {
  BookDocument,
  BookFontId,
  BookFormat,
  CoverColorId,
  CoverTextStyle,
} from "@/types/book";

// True when any emphasis flag is set — used to omit empty style objects so an
// untouched cover stays free of emphasis.
export function hasEmphasis(style?: CoverTextStyle): boolean {
  return Boolean(style && (style.bold || style.italic || style.underline));
}

// Stable empty map — the create flow previews covers before any photo exists.
export const NO_PHOTOS: Record<string, PhotoDto> = {};

export interface CoverPreviewInput {
  format: BookFormat;
  layoutId: string;
  colorId: CoverColorId;
  fontId: BookFontId;
  // Optional so layout minis can stay on the placeholder title while the big
  // preview tracks the live one typed by the customer.
  title?: string;
  subtitle?: string;
  titleStyle?: CoverTextStyle;
  subtitleStyle?: CoverTextStyle;
}

// Sample document for previews: pure document ops on a fresh empty book. Never
// persisted — the server action builds the real document from submitted fields.
// An empty title falls back to a legible placeholder so the cover is never bare.
export function sampleCover({
  format,
  layoutId,
  colorId,
  fontId,
  title,
  subtitle,
  titleStyle,
  subtitleStyle,
}: CoverPreviewInput): BookDocument {
  const trimmedTitle = title?.trim();
  const trimmedSubtitle = subtitle?.trim();
  return updateCoverStyle(
    switchCoverLayout(createEmptyBookDocument(format), layoutId),
    {
      colorId,
      fontId,
      title: trimmedTitle ? trimmedTitle : en.create.titlePlaceholder,
      subtitle: trimmedSubtitle ? trimmedSubtitle : undefined,
      titleStyle: hasEmphasis(titleStyle) ? titleStyle : undefined,
      subtitleStyle: hasEmphasis(subtitleStyle) ? subtitleStyle : undefined,
    },
  );
}

export function coverLayoutLabel(id: string): string {
  return id in en.coverLayouts
    ? en.coverLayouts[id as keyof typeof en.coverLayouts]
    : id;
}

// ---------------------------------------------------------------------------
// ARIA radio pattern helpers shared by the picker steps: roving tabindex (the
// selected option is the single tab stop — the first option when none is
// selected) and arrow keys that move BOTH selection and focus, wrapping.
// ---------------------------------------------------------------------------

const ARROW_KEY_OFFSETS: Readonly<Record<string, 1 | -1>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

export function radioTabIndex(index: number, selectedIndex: number): 0 | -1 {
  return index === Math.max(selectedIndex, 0) ? 0 : -1;
}

export function moveRadioSelection<T>(
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
  // Focus follows selection: the radios sit in DOM order inside the enclosing
  // radiogroup, matching the options order.
  event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelectorAll<HTMLElement>('[role="radio"]')
    [nextIndex]?.focus();
}

export const cardBase =
  "rounded-xl border bg-white text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper";

export function cardSelected(selected: boolean): string {
  return selected
    ? "border-terracotta ring-1 ring-terracotta"
    : "border-sand hover:border-terracotta";
}
