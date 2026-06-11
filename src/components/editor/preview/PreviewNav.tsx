"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { en } from "@/i18n/en";

// Prev/next paging controls plus the page label and position indicator,
// rendered below the stage. Buttons are 44px+ targets and disable at the
// ends; keyboard arrows and swipe in the overlay drive the same onNavigate.

type PreviewNavProps = Readonly<{
  pageIndex: number;
  total: number;
  onNavigate: (direction: 1 | -1) => void;
}>;

const NAV_BUTTON_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors duration-150 motion-reduce:transition-none hover:bg-paper/25 disabled:opacity-40 disabled:hover:bg-paper/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta";

function pageLabel(pageIndex: number): string {
  if (pageIndex === 0) return en.editor.preview.coverLabel;
  return en.editor.preview.spreadLabel.replace("{n}", String(pageIndex));
}

export function PreviewNav({ pageIndex, total, onNavigate }: PreviewNavProps) {
  const position = en.editor.preview.pageOfTotal
    .replace("{current}", String(pageIndex + 1))
    .replace("{total}", String(total));
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onNavigate(-1)}
        disabled={pageIndex === 0}
        aria-label={en.editor.preview.previous}
        className={NAV_BUTTON_CLASS}
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </button>
      <p className="min-w-32 text-center" aria-live="polite">
        <span className="block text-sm font-medium text-paper">
          {pageLabel(pageIndex)}
        </span>
        <span className="block text-xs text-paper/60">{position}</span>
      </p>
      <button
        type="button"
        onClick={() => onNavigate(1)}
        disabled={pageIndex === total - 1}
        aria-label={en.editor.preview.next}
        className={NAV_BUTTON_CLASS}
      >
        <ChevronRight className="size-6" aria-hidden="true" />
      </button>
    </div>
  );
}
