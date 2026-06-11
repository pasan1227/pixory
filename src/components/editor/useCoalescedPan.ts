"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useEditorStoreApi } from "@/stores/editor-store";

export interface CoalescedPan {
  // Call when a pan gesture starts (possibly on another slot).
  onPanStart: () => void;
  // Call after each crop delta that ACTUALLY changed the document. A
  // dead-axis delta (store kept the same reference) must not call this:
  // pausing history before anything was recorded would merge the gesture
  // into the previous undo entry.
  recordPanDelta: () => void;
  // Call when the gesture ends.
  onPanEnd: () => void;
}

// Pan gesture coalescing, shared by the spread and cover canvas paths: the
// first crop delta of a drag is recorded by zundo, then history is paused for
// the rest of the gesture and resumed on pan end — so one drag lands in
// history as exactly one undo entry.
export function useCoalescedPan(resetKey: number | null): CoalescedPan {
  const api = useEditorStoreApi();
  const panRecordedRef = useRef(false);
  const pausedRef = useRef(false);

  // Selection moved to another slot: any in-flight gesture already ended via
  // the pan hook's disable cleanup; reset defensively (also on unmount) so a
  // paused history can never leak into the next gesture. Never resume a pause
  // we don't own.
  useEffect(() => {
    const reset = () => {
      panRecordedRef.current = false;
      if (pausedRef.current) {
        pausedRef.current = false;
        api.temporal.getState().resume();
      }
    };
    reset();
    return reset;
  }, [resetKey, api]);

  const onPanStart = useCallback(() => {
    // New gesture: its first delta must record.
    panRecordedRef.current = false;
  }, []);

  const recordPanDelta = useCallback(() => {
    if (panRecordedRef.current) return;
    // The first delta just landed in history; pause so the rest of the
    // gesture coalesces into that single entry.
    panRecordedRef.current = true;
    pausedRef.current = true;
    api.temporal.getState().pause();
  }, [api]);

  const onPanEnd = useCallback(() => {
    panRecordedRef.current = false;
    // Only resume a pause we own — a zero-delta gesture never paused.
    if (!pausedRef.current) return;
    pausedRef.current = false;
    api.temporal.getState().resume();
  }, [api]);

  // Stable object so consumers can keep it in hook dependency arrays.
  return useMemo(
    () => ({ onPanStart, recordPanDelta, onPanEnd }),
    [onPanStart, recordPanDelta, onPanEnd],
  );
}
