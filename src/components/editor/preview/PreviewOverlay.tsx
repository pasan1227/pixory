"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { PreviewChecklistPanel } from "@/components/editor/preview/PreviewChecklistPanel";
import { PreviewNav } from "@/components/editor/preview/PreviewNav";
import { PreviewPage } from "@/components/editor/preview/PreviewPage";
import { usePreviewPager } from "@/components/editor/preview/usePreviewPager";
import { en } from "@/i18n/en";
import {
  checkCompleteness,
  type CompletenessIssue,
  type PhotoDims,
} from "@/lib/completeness";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookDocument } from "@/types/book";

// Full-screen immersive preview: cover + spreads as a paged book with the
// shared page-turn motion, plus the completeness checklist. Loaded via
// next/dynamic from the shell ONLY when opened, so framer-motion never lands
// in the editor's initial bundle. Default export for next/dynamic.

type PreviewOverlayProps = Readonly<{
  document: BookDocument;
  photosById: Record<string, PhotoDto>;
  onClose: () => void;
  onFixIssue: (issue: CompletenessIssue) => void;
  // When set, the preview chrome shows a prominent Order CTA linking here.
  checkoutHref?: string;
}>;

export default function PreviewOverlay({
  // Renamed locally so the scroll-lock effect can reach the real DOM
  // `document` without shadowing.
  document: doc,
  photosById,
  onClose,
  onFixIssue,
  checkoutHref,
}: PreviewOverlayProps) {
  const total = doc.spreads.length + 1;
  const overlayRef = useRef<HTMLDivElement>(null);
  const { page, navigate, goTo, onPointerDown, onPointerUp } = usePreviewPager(
    total,
    onClose,
  );

  const photoDims = useMemo(() => {
    const dims: Record<string, PhotoDims> = {};
    for (const photo of Object.values(photosById)) {
      dims[photo.id] = { width: photo.width, height: photo.height };
    }
    return dims;
  }, [photosById]);
  const issues = useMemo(
    () => checkCompleteness(doc, photoDims),
    [doc, photoDims],
  );

  // Focus moves into the dialog on mount; body scroll is locked while open
  // (the overlay is only mounted while preview is open).
  useEffect(() => {
    overlayRef.current?.focus();
    const root = window.document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={en.editor.preview.open}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-ink/95 text-paper outline-none"
    >
      <header className="flex shrink-0 items-center justify-end gap-2 px-2 py-1">
        {checkoutHref && (
          <Link
            href={checkoutHref}
            className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-6 font-medium text-paper transition-colors duration-150 motion-reduce:transition-none hover:bg-terracotta-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            {en.checkout.title}
          </Link>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={en.editor.preview.close}
          className="flex size-11 items-center justify-center rounded-md text-paper/80 transition-colors duration-150 motion-reduce:transition-none hover:bg-paper/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1">
        <main
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="flex min-w-0 flex-1 touch-pan-y flex-col items-center justify-center gap-4 overflow-hidden px-4 pb-20 lg:pb-6"
        >
          <PreviewPage
            document={doc}
            photosById={photosById}
            pageIndex={page.index}
            direction={page.direction}
          />
          <PreviewNav
            pageIndex={page.index}
            total={total}
            onNavigate={navigate}
          />
        </main>
        <PreviewChecklistPanel
          issues={issues}
          onGoTo={goTo}
          onFixIssue={onFixIssue}
        />
      </div>
    </div>
  );
}
