"use client";

import { useCallback, useEffect } from "react";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import type { PickTarget } from "@/components/editor/pick-target";
import { SpreadRenderer } from "@/components/editor/spread/SpreadRenderer";
import {
  useCoalescedPan,
  type CoalescedPan,
} from "@/components/editor/useCoalescedPan";
import { getSpreadLayout } from "@/data/layouts";
import { panCropByPixels } from "@/lib/crop";
import { PRINT_SPECS } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore, useEditorStoreApi } from "@/stores/editor-store";
import type { CoverSlot, SlotContent } from "@/types/book";
import type { SlotDef } from "@/types/layout";

type SpreadCanvasProps = Readonly<{
  photosById: Record<string, PhotoDto>;
  onRequestPhotoPick: (target: PickTarget) => void;
}>;

type CanvasViewProps = Readonly<{
  photosById: Record<string, PhotoDto>;
  onRequestPhotoPick: (target: PickTarget) => void;
  pan: CoalescedPan;
}>;

// After undo, selection.spreadIndex may point past the last spread — always
// clamp before indexing into doc.spreads.
function clampSpreadIndex(index: number, spreadCount: number): number {
  return Math.min(index, spreadCount - 1);
}

// Cover mode: the same interaction grammar as the spread path, against the
// cover's photoSlots (indices align with the cover layout's rects).
function CoverCanvas({ photosById, onRequestPhotoPick, pan }: CanvasViewProps) {
  const api = useEditorStoreApi();
  const doc = useEditorStore((s) => s.document);
  const selectedSlotIndex = useEditorStore((s) => s.selection.slotIndex);

  const handleSlotClick = useCallback(
    (slotIndex: number) => {
      const state = api.getState();
      const slot: CoverSlot | undefined =
        state.document.cover.photoSlots[slotIndex];
      if (slot === undefined || slot.kind !== "photo") {
        onRequestPhotoPick({ view: "cover", spreadIndex: 0, slotIndex });
      }
      // Clicking an already-selected slot keeps it selected — no toggle-off.
      state.selectSlot(slotIndex);
    },
    [api, onRequestPhotoPick],
  );

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
      const slot: CoverSlot | undefined =
        state.document.cover.photoSlots[slotIndex];
      if (slot === undefined || slot.kind !== "photo") return;
      const photo: PhotoDto | undefined = photosById[slot.photoId];
      if (!photo) return;
      const before = state.document;
      state.setCoverCrop(
        slotIndex,
        panCropByPixels(
          { width: photo.width, height: photo.height },
          slotPx,
          slot.crop,
          dxPx,
          dyPx,
        ),
      );
      // A delta along a dead pan axis leaves the document untouched (the
      // store skips no-op crops, keeping the reference identical). Recording
      // it would pause history with ZERO entries for this gesture, merging
      // the whole drag into the previous undo entry — record real changes only.
      if (api.getState().document !== before) pan.recordPanDelta();
    },
    [api, photosById, pan],
  );

  const spec = PRINT_SPECS[doc.format];
  // Cap width by the viewport-height room too: a square cover constrained
  // only by max-width would overflow vertically behind the filmstrip.
  // ~17rem ≈ header + filmstrip + paddings.
  const coverMaxWidth = `min(42rem, calc((100dvh - 17rem) * ${
    spec.pageWidthMm / spec.pageHeightMm
  }))`;

  return (
    <div className="flex w-full justify-center px-4 py-6 sm:px-8 sm:py-10">
      <CoverRenderer
        document={doc}
        photosById={photosById}
        selectedSlotIndex={selectedSlotIndex}
        onSlotClick={handleSlotClick}
        onSlotPan={handleSlotPan}
        onSlotPanStart={pan.onPanStart}
        onSlotPanEnd={pan.onPanEnd}
        showSpine
        showBadges
        className="w-full shadow-md"
        style={{ maxWidth: coverMaxWidth }}
      />
    </div>
  );
}

function SpreadView({ photosById, onRequestPhotoPick, pan }: CanvasViewProps) {
  const api = useEditorStoreApi();
  const doc = useEditorStore((s) => s.document);
  const selectedSlotIndex = useEditorStore((s) => s.selection.slotIndex);
  const spreadIndex = useEditorStore((s) =>
    clampSpreadIndex(s.selection.spreadIndex, s.document.spreads.length),
  );
  const spread = doc.spreads[spreadIndex];

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
        onRequestPhotoPick({ view: "spread", spreadIndex: index, slotIndex });
      }
      // Clicking an already-selected slot keeps it selected — no toggle-off.
      state.selectSlot(slotIndex);
    },
    [api, onRequestPhotoPick],
  );

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
      const before = state.document;
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
      // A delta along a dead pan axis leaves the document untouched (the
      // store skips no-op crops, keeping the reference identical). Recording
      // it would pause history with ZERO entries for this gesture, merging
      // the whole drag into the previous undo entry — record real changes only.
      if (api.getState().document !== before) pan.recordPanDelta();
    },
    [api, photosById, pan],
  );

  return (
    <div className="flex w-full justify-center px-4 py-6 sm:px-8 sm:py-10">
      <SpreadRenderer
        format={doc.format}
        spread={spread}
        photosById={photosById}
        selectedSlotIndex={selectedSlotIndex}
        onSlotClick={handleSlotClick}
        onSlotPan={handleSlotPan}
        onSlotPanStart={pan.onPanStart}
        onSlotPanEnd={pan.onPanEnd}
        showBadges
        className="w-full max-w-4xl shadow-md"
      />
    </div>
  );
}

export function SpreadCanvas({
  photosById,
  onRequestPhotoPick,
}: SpreadCanvasProps) {
  const view = useEditorStore((s) => s.selection.view);
  const selectedSlotIndex = useEditorStore((s) => s.selection.slotIndex);
  const selectSlot = useEditorStore((s) => s.selectSlot);
  // One shared instance for both views: it stays mounted across cover/spread
  // switches, so an owned pause can always be resumed.
  const pan = useCoalescedPan(selectedSlotIndex);

  // Escape deselects the active slot (panel "Done" is the pointer equivalent).
  useEffect(() => {
    if (selectedSlotIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // An open modal owns Escape: it closes itself, and the same keystroke
      // must not also deselect the slot underneath. Closed mobile sheets stay
      // MOUNTED with role="dialog" so their slide animation can play, but
      // they are `inert` — so only a dialog outside any inert subtree counts
      // as actually open.
      const hasOpenModal = [
        ...document.querySelectorAll('[role="dialog"][aria-modal="true"]'),
      ].some((dialog) => !dialog.closest("[inert]"));
      if (hasOpenModal) return;
      selectSlot(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedSlotIndex, selectSlot]);

  if (view === "cover") {
    return (
      <CoverCanvas
        photosById={photosById}
        onRequestPhotoPick={onRequestPhotoPick}
        pan={pan}
      />
    );
  }
  return (
    <SpreadView
      photosById={photosById}
      onRequestPhotoPick={onRequestPhotoPick}
      pan={pan}
    />
  );
}
