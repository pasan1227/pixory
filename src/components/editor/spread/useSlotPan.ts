"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

// Drag-to-pan plumbing for a filled photo slot. Reports pointer deltas (since
// the previous event) plus the slot's rendered pixel size — the caller feeds
// these to panCropByPixels(); no crop math lives here. onPanStart/onPanEnd
// bracket each gesture (end fires exactly once per started gesture, including
// a mid-gesture disable) so the caller can coalesce history entries.

type PanHandlers = Readonly<{
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void;
}>;

export function useSlotPan(
  enabled: boolean,
  onPan: (dxPx: number, dyPx: number, slotPx: { width: number; height: number }) => void,
  onPanStart?: () => void,
  onPanEnd?: () => void,
): { panning: boolean; handlers: PanHandlers } {
  const last = useRef<{ x: number; y: number } | null>(null);
  // True between a started pointerdown and its matching end — guarantees
  // onPanEnd fires exactly once per gesture however the gesture ends.
  const gestureActive = useRef(false);
  const [panning, setPanning] = useState(false);

  // Latest-callback ref: the inline arrows callers pass change identity every
  // render and must not retrigger (or be stale inside) the cleanup below.
  const onPanEndRef = useRef(onPanEnd);
  useEffect(() => {
    onPanEndRef.current = onPanEnd;
  }, [onPanEnd]);

  // Disable (or unmount) mid-gesture: drop the pointer state so no stale
  // grabbing cursor / touch-none / phantom first-move jump survives, and
  // close out the gesture so the caller can resume history recording.
  useEffect(() => {
    if (!enabled) return;
    return () => {
      last.current = null;
      setPanning(false);
      if (gestureActive.current) {
        gestureActive.current = false;
        onPanEndRef.current?.();
      }
    };
  }, [enabled]);

  // While disabled, no handlers are attached, and the cleanup effect above
  // has already dropped the pointer state — nothing stale can fire.
  if (!enabled) return { panning: false, handlers: {} };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Primary button + primary pointer only — no right-drag or multi-touch.
    if (event.button !== 0 || !event.isPrimary) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
    gestureActive.current = true;
    setPanning(true);
    onPanStart?.();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Only track pointers this slot captured on pointerdown.
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    // buttons guard: ignore hover moves and any pan left dangling by a
    // mid-drag disable (e.g. selection moved away while dragging).
    if (last.current === null || event.buttons === 0) return;
    const dx = event.clientX - last.current.x;
    const dy = event.clientY - last.current.y;
    if (dx === 0 && dy === 0) return;
    last.current = { x: event.clientX, y: event.clientY };
    const box = event.currentTarget.getBoundingClientRect();
    onPan(dx, dy, { width: box.width, height: box.height });
  };

  const endPan = () => {
    last.current = null;
    setPanning(false);
    if (gestureActive.current) {
      gestureActive.current = false;
      onPanEnd?.();
    }
  };

  return {
    panning,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
    },
  };
}
