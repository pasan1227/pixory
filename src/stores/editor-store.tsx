"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { temporal } from "zundo";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  clearCoverSlot as clearCoverSlotOp,
  placeCoverPhoto as placeCoverPhotoOp,
  setCoverCrop as setCoverCropOp,
  switchCoverLayout as switchCoverLayoutOp,
  updateCoverStyle as updateCoverStyleOp,
  type CoverStylePatch,
} from "@/lib/cover-ops";
import { distributePhotos, type DistributablePhoto } from "@/lib/distribute";
import {
  addSpreadAfter as addSpreadAfterOp,
  clearSlot as clearSlotOp,
  moveSpread as moveSpreadOp,
  placePhoto as placePhotoOp,
  removeSpread as removeSpreadOp,
  replaceSpreads as replaceSpreadsOp,
  setSlotCrop as setSlotCropOp,
  setSlotText as setSlotTextOp,
  switchSpreadLayout as switchSpreadLayoutOp,
} from "@/lib/document-ops";
import type {
  BookDocument,
  BookFontId,
  Crop,
  TextAlign,
} from "@/types/book";

// ---------------------------------------------------------------------------
// One store per book editing session (created by the provider below — no
// global state). Undo/redo via zundo is scoped to DOCUMENT edits only:
// history is partialized to { document } and recorded only when the document
// reference changes, so selection/navigation never pollute it. Cap: 50.
//
// Action discipline: every document mutation computes the next document with
// a pure op from src/lib/document-ops on the COMMITTED state (get()), skips
// set() entirely when the op was a no-op (same reference), and assigns the
// result inside the immer draft. Ops must never run on immer drafts — nested
// produce would silently break the no-op reference contract.
// ---------------------------------------------------------------------------

export interface EditorSelection {
  // What the canvas shows: the cover or a spread. slotIndex addresses the
  // cover's photoSlots when view is "cover", the spread's slots otherwise.
  view: "cover" | "spread";
  spreadIndex: number;
  slotIndex: number | null;
}

export interface EditorState {
  document: BookDocument;
  selection: EditorSelection;
  selectCover(): void;
  selectSpread(index: number): void;
  selectSlot(slotIndex: number | null): void;
  updateCoverStyle(patch: CoverStylePatch): void;
  switchCoverLayout(layoutId: string): void;
  placeCoverPhoto(slotIndex: number, photoId: string): void;
  setCoverCrop(slotIndex: number, crop: Crop): void;
  clearCoverSlot(slotIndex: number): void;
  placePhoto(spreadIndex: number, slotIndex: number, photoId: string): void;
  setCrop(spreadIndex: number, slotIndex: number, crop: Crop): void;
  setText(
    spreadIndex: number,
    slotIndex: number,
    input: { text: string; fontId: BookFontId; align: TextAlign },
  ): void;
  clearSlot(spreadIndex: number, slotIndex: number): void;
  switchLayout(spreadIndex: number, layoutId: string): void;
  addSpreadAfter(index: number): void;
  removeSpread(index: number): void;
  moveSpread(fromIndex: number, toIndex: number): void;
  // Auto-create: distribute photos chronologically across fresh spreads,
  // replacing the current spread list. ONE history entry — fully undoable.
  autoCreate(photos: DistributablePhoto[]): void;
}

const HISTORY_LIMIT = 50;

function clampIndex(value: number, count: number): number {
  return Math.max(0, Math.min(value, count - 1));
}

export function createEditorStore(initialDocument: BookDocument) {
  return createStore<EditorState>()(
    temporal(
      immer((set, get) => {
        // Apply a pure document op; a no-op (same reference) skips set()
        // entirely so no history entry is recorded.
        const apply = (
          next: BookDocument,
          alsoSelect?: (selection: EditorSelection) => void,
        ): void => {
          if (next === get().document) return;
          set((state) => {
            state.document = next;
            if (alsoSelect) alsoSelect(state.selection);
            state.selection.spreadIndex = clampIndex(
              state.selection.spreadIndex,
              next.spreads.length,
            );
          });
        };

        return {
          document: initialDocument,
          selection: { view: "spread", spreadIndex: 0, slotIndex: null },

          selectCover: () =>
            set((state) => {
              state.selection.view = "cover";
              state.selection.slotIndex = null;
            }),

          selectSpread: (index) =>
            set((state) => {
              state.selection.view = "spread";
              state.selection.spreadIndex = clampIndex(
                index,
                state.document.spreads.length,
              );
              state.selection.slotIndex = null;
            }),

          selectSlot: (slotIndex) =>
            set((state) => {
              state.selection.slotIndex = slotIndex;
            }),

          updateCoverStyle: (patch) =>
            apply(updateCoverStyleOp(get().document, patch)),

          switchCoverLayout: (layoutId) =>
            apply(
              switchCoverLayoutOp(get().document, layoutId),
              (selection) => {
                selection.slotIndex = null;
              },
            ),

          placeCoverPhoto: (slotIndex, photoId) =>
            apply(placeCoverPhotoOp(get().document, slotIndex, photoId)),

          setCoverCrop: (slotIndex, crop) =>
            apply(setCoverCropOp(get().document, slotIndex, crop)),

          clearCoverSlot: (slotIndex) =>
            apply(clearCoverSlotOp(get().document, slotIndex)),

          placePhoto: (spreadIndex, slotIndex, photoId) =>
            apply(
              placePhotoOp(get().document, spreadIndex, slotIndex, photoId),
            ),

          setCrop: (spreadIndex, slotIndex, crop) =>
            apply(
              setSlotCropOp(get().document, spreadIndex, slotIndex, crop),
            ),

          setText: (spreadIndex, slotIndex, input) =>
            apply(
              setSlotTextOp(get().document, spreadIndex, slotIndex, input),
            ),

          clearSlot: (spreadIndex, slotIndex) =>
            apply(clearSlotOp(get().document, spreadIndex, slotIndex)),

          switchLayout: (spreadIndex, layoutId) =>
            apply(
              switchSpreadLayoutOp(get().document, spreadIndex, layoutId),
              // The new layout may have fewer slots than the selected index.
              (selection) => {
                selection.slotIndex = null;
              },
            ),

          addSpreadAfter: (index) =>
            apply(
              addSpreadAfterOp(get().document, index, crypto.randomUUID()),
              (selection) => {
                selection.spreadIndex = index + 1;
                selection.slotIndex = null;
              },
            ),

          removeSpread: (index) =>
            apply(removeSpreadOp(get().document, index), (selection) => {
              selection.slotIndex = null;
            }),

          moveSpread: (fromIndex, toIndex) =>
            apply(
              moveSpreadOp(get().document, fromIndex, toIndex),
              (selection) => {
                // Keep the selection on the spread the user was editing.
                if (selection.spreadIndex === fromIndex) {
                  selection.spreadIndex = toIndex;
                }
              },
            ),

          autoCreate: (photos) => {
            const doc = get().document;
            const { spreads } = distributePhotos(photos, doc.format);
            apply(replaceSpreadsOp(doc, spreads), (selection) => {
              selection.view = "spread";
              selection.spreadIndex = 0;
              selection.slotIndex = null;
            });
          },
        };
      }),
      {
        limit: HISTORY_LIMIT,
        partialize: (state) => ({ document: state.document }),
        equality: (past, current) => past.document === current.document,
      },
    ),
  );
}

export type EditorStoreApi = ReturnType<typeof createEditorStore>;

const EditorStoreContext = createContext<EditorStoreApi | null>(null);

export function EditorStoreProvider({
  initialDocument,
  children,
}: Readonly<{ initialDocument: BookDocument; children: ReactNode }>) {
  // Lazy initializer: one store per mounted editor session.
  const [store] = useState(() => createEditorStore(initialDocument));
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  );
}

export function useEditorStoreApi(): EditorStoreApi {
  const store = useContext(EditorStoreContext);
  if (!store) {
    throw new Error("useEditorStore must be used inside EditorStoreProvider");
  }
  return store;
}

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useStore(useEditorStoreApi(), selector);
}

// Undo/redo controls — document edits only, capped at HISTORY_LIMIT.
export function useEditorHistory(): {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
} {
  const api = useEditorStoreApi();
  const canUndo = useStore(api.temporal, (s) => s.pastStates.length > 0);
  const canRedo = useStore(api.temporal, (s) => s.futureStates.length > 0);
  return {
    undo: () => api.temporal.getState().undo(),
    redo: () => api.temporal.getState().redo(),
    canUndo,
    canRedo,
  };
}
