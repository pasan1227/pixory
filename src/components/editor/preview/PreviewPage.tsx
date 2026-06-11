"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import { SpreadRenderer } from "@/components/editor/spread/SpreadRenderer";
import { pageTurnTransition, pageTurnVariants } from "@/lib/motion";
import { PRINT_SPECS, spreadAspectRatio } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookDocument } from "@/types/book";

// The animated page stage of preview mode. Index 0 is the cover; index n is
// spread n-1. AnimatePresence mode="wait" means only the active page is ever
// mounted, and the direction-aware variants from @/lib/motion play a
// book-like turn (perspective on the stage makes rotateY read as depth).
// MotionConfig reducedMotion="user" is the one sanctioned reduced-motion
// mechanism for framer trees.

type PreviewPageProps = Readonly<{
  document: BookDocument;
  photosById: Record<string, PhotoDto>;
  pageIndex: number;
  direction: number;
}>;

export function PreviewPage({
  document,
  photosById,
  pageIndex,
  direction,
}: PreviewPageProps) {
  const spread = pageIndex > 0 ? document.spreads[pageIndex - 1] : undefined;
  const spec = PRINT_SPECS[document.format];
  // Height-aware width clamp: short viewports (landscape phones, small
  // windows) must scale the page down, never clip it. ~11rem ≈ preview
  // header + nav chrome.
  const aspect = spread
    ? spreadAspectRatio(document.format)
    : spec.pageWidthMm / spec.pageHeightMm;
  const maxWidth = `min(${spread ? "56rem" : "28rem"}, calc((100dvh - 11rem) * ${aspect}))`;
  return (
    <MotionConfig reducedMotion="user">
      <div
        className="flex w-full justify-center"
        style={{ perspective: 1200 }}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={pageIndex}
            custom={direction}
            variants={pageTurnVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTurnTransition}
            className="w-full"
            style={{ maxWidth }}
          >
            {/* Renderers are read-only here (no callbacks) and must not
                capture pointer events — swipes land on the stage instead. */}
            <div className="pointer-events-none select-none">
              {spread ? (
                <SpreadRenderer
                  format={document.format}
                  spread={spread}
                  photosById={photosById}
                />
              ) : (
                <CoverRenderer
                  document={document}
                  photosById={photosById}
                  showSpine
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
