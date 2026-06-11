"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

// Paging state + input handling for the preview overlay: clamped index with
// turn direction (for the direction-aware page-turn variants), capture-phase
// keyboard (Escape closes, arrows page) and basic horizontal swipe.

const SWIPE_THRESHOLD_PX = 50;

// One state object so page index and turn direction update atomically.
export type PageState = { index: number; direction: 1 | -1 };

export function usePreviewPager(total: number, onClose: () => void) {
  const [page, setPage] = useState<PageState>({ index: 0, direction: 1 });
  const swipeStartX = useRef<number | null>(null);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      setPage((current) => {
        const index = current.index + direction;
        if (index < 0 || index >= total) return current;
        return { index, direction };
      });
    },
    [total],
  );
  const goTo = useCallback(
    (index: number) => {
      setPage((current) => {
        const next = Math.min(Math.max(index, 0), total - 1);
        if (next === current.index) return current;
        return { index: next, direction: next > current.index ? 1 : -1 };
      });
    },
    [total],
  );

  // CAPTURE phase: the preview is the topmost modal, so Escape is consumed
  // here before the editor's bubble-phase listeners (sheets, canvas
  // deselect) can react. Arrow keys page through the book.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") navigate(-1);
      if (event.key === "ArrowRight") navigate(1);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, navigate]);

  // Basic horizontal swipe on the stage (pages are pointer-events-none, so
  // gestures land on the stage container).
  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    swipeStartX.current = event.clientX;
  }, []);
  const onPointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const startX = swipeStartX.current;
      swipeStartX.current = null;
      if (startX === null) return;
      const delta = event.clientX - startX;
      if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
      navigate(delta < 0 ? 1 : -1);
    },
    [navigate],
  );

  return { page, navigate, goTo, onPointerDown, onPointerUp };
}
