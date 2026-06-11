// Shared motion configuration. prefers-reduced-motion is honored centrally:
// CSS micro-interactions use motion-safe:/motion-reduce: variants, and every
// framer-motion tree must be wrapped in <MotionConfig reducedMotion="user">
// — never per-component media queries.

// Editor micro-interactions cap (CLAUDE.md: <= 150ms).
export const MICRO_SECONDS = 0.15;

// Page-turn in preview mode — the one deliberate, slower animation.
export const PAGE_TURN_SECONDS = 0.45;

export const PAGE_TURN_EASE = [0.32, 0.72, 0.3, 1] as const;

// Direction-aware page-turn variants for AnimatePresence (custom = +1 next,
// -1 previous): a horizontal slide with a slight perspective tilt — book-like
// without skeuomorphic excess.
export const pageTurnVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "60%" : "-60%",
    rotateY: direction > 0 ? -18 : 18,
    opacity: 0,
  }),
  center: { x: 0, rotateY: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? "-60%" : "60%",
    rotateY: direction > 0 ? 18 : -18,
    opacity: 0,
  }),
} as const;

export const pageTurnTransition = {
  duration: PAGE_TURN_SECONDS,
  ease: PAGE_TURN_EASE,
} as const;
