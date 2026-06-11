"use client";

import { useCallback, useEffect, useRef } from "react";
import { SpreadRenderer } from "@/components/editor/spread/SpreadRenderer";
import { getSpreadLayout } from "@/data/layouts";
import { panCropByPixels } from "@/lib/crop";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore, useEditorStoreApi } from "@/stores/editor-store";
import type { SlotContent } from "@/types/book";
import type { SlotDef } from "@/types/layout";

type SpreadCanvasProps = Readonly<{
  photosById: Record<string, PhotoDto>;
  onRequestPhotoPick: (spreadIndex: number, slotIndex: number) => void;
}>;

// After undo, selection.spreadIndex may point past the last spread — always
// clamp before indexing into doc.spreads.
function clampSpreadIndex(index: number, spreadCount: number): number {
  return Math.min(index, spreadCount - 1);
}

export function SpreadCanvas({
  photosById,
  onRequestPhotoPick,
}: SpreadCanvasProps) {
  const api = useEditorStoreApi();
  const doc = useEditorStore((s) => s.document);
  const selectedSlotIndex = useEditorStore((s) => s.selection.slotIndex);
  const selectSlot = useEditorStore((s) => s.selectSlot);
  const spreadIndex = useEditorStore((s) =>
    clampSpreadIndex(s.selection.spreadIndex, s.document.spreads.length),
  );
  const spread = doc.spreads[spreadIndex];

  // Pan gesture coalescing: the first crop delta of a drag is recorded by
  // zundo, then history is paused for the rest of the gesture and resumed on
  // pan end — so one drag lands in history as exactly one undo entry.
  const panRecordedRef = useRef(false);
  const pausedRef = useRef(false);

  // Escape deselects the active slot (panel "Done" is the pointer equivalent).
  useEffect(() => {
    if (selectedSlotIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // An open modal (e.g. the photo picker) owns Escape: it closes itself,
      // and the same keystroke must not also deselect the slot underneath.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      selectSlot(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSlotIndex, selectSlot]);

  // Selection moved to another slot: any in-flight gesture already ended via
  // the pan hook's disable cleanup; reset defensively so a paused history can
  // never leak into the next gesture. Never resume a pause we don't own.
  useEffect(() => {
    panRecordedRef.current = false;
    if (pausedRef.current) {
      pausedRef.current = false;
      api.temporal.getState().resume();
    }
  }, [selectedSlotIndex, api]);

  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      const state = api.getState();
      const index = clampSpreadIndex(
        state.selection.spreadIndex,
        state.document.spreads.length,
      );
      const current = state.document.spreads[index];
      const layoutSlot: SlotDef | undefined = getSpreadLayout(current.layoutId)
        .slots[slotIndex];
      const content: SlotContent | undefined = current.slots[slotIndex];
      if (layoutSlot === undefined || content === undefined) return;
      if (layoutSlot.type === "photo" && content.kind !== "photo") {
        onRequestPhotoPick(index, slotIndex);
      }
      // Clicking an already-selected slot keeps it selected — no toggle-off.
      state.selectSlot(slotIndex);
    },
    [api, onRequestPhotoPick],
  );

  const handleSlotPanStart = useCallback(() => {
    // New gesture (possibly on another slot): its first delta must record.
    panRecordedRef.current = false;
  }, []);

  // Pan reads the committed state at event time: pointer events outpace React
  // renders, and stale crops would drop movement between frames.
  const handleSlotPan = useCallback(
    (
      slotIndex: number,
      dxPx: number,
      dyPx: number,
      slotPx: { width: number; height: number },
    ) => {
      const state = api.getState();
      const index = clampSpreadIndex(
        state.selection.spreadIndex,
        state.document.spreads.length,
      );
      const content: SlotContent | undefined =
        state.document.spreads[index].slots[slotIndex];
      if (content === undefined || content.kind !== "photo") return;
      const photo: PhotoDto | undefined = photosById[content.photoId];
      if (!photo) return;
      state.setCrop(
        index,
        slotIndex,
        panCropByPixels(
          { width: photo.width, height: photo.height },
          slotPx,
          content.crop,
          dxPx,
          dyPx,
        ),
      );
      if (!panRecordedRef.current) {
        // The first delta just landed in history; pause so the rest of the
        // gesture coalesces into that single entry.
        panRecordedRef.current = true;
        pausedRef.current = true;
        api.temporal.getState().pause();
      }
    },
    [api, photosById],
  );

  const handleSlotPanEnd = useCallback(() => {
    panRecordedRef.current = false;
    // Only resume a pause we own — a zero-delta gesture never paused.
    if (!pausedRef.current) return;
    pausedRef.current = false;
    api.temporal.getState().resume();
  }, [api]);

  return (
    <div className="flex w-full justify-center px-4 py-6 sm:px-8 sm:py-10">
      <SpreadRenderer
        format={doc.format}
        spread={spread}
        photosById={photosById}
        selectedSlotIndex={selectedSlotIndex}
        onSlotClick={handleSlotClick}
        onSlotPan={handleSlotPan}
        onSlotPanStart={handleSlotPanStart}
        onSlotPanEnd={handleSlotPanEnd}
        showBadges
        className="w-full max-w-4xl shadow-md"
      />
    </div>
  );
}
