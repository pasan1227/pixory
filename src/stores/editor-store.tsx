"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { temporal } from "zundo";
import { createStore, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";
import {
  addSpreadAfter as addSpreadAfterOp,
  clearSlot as clearSlotOp,
  moveSpread as moveSpreadOp,
  placePhoto as placePhotoOp,
  removeSpread as removeSpreadOp,
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
  spreadIndex: number;
  slotIndex: number | null;
}

export interface EditorState {
  document: BookDocument;
  selection: EditorSelection;
  selectSpread(index: number): void;
  selectSlot(slotIndex: number | null): void;
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
}

const HISTORY_LIMIT = 50;

function clampIndex(value: number, count: number): number {
  return Math.max(0, Math.min(value, count - 1));
}

export function createEditorStore(initialDocument: BookDocument) {
  return createStore<EditorState>()(
    temporal(
      immer((set, get) => {
        // Apply a pure document op; returns true when the document changed.
        const apply = (
          next: BookDocument,
          alsoSelect?: (selection: EditorSelection) => void,
        ): boolean => {
          if (next === get().document) return false;
          set((state) => {
            state.document = next;
            if (alsoSelect) alsoSelect(state.selection);
            state.selection.spreadIndex = clampIndex(
              state.selection.spreadIndex,
              next.spreads.length,
            );
          });
          return true;
        };

        return {
          document: initialDocument,
          selection: { spreadIndex: 0, slotIndex: null },

          selectSpread: (index) =>
            set((state) => {
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

          placePhoto: (spreadIndex, slotIndex, photoId) =>
            void apply(
              placePhotoOp(get().document, spreadIndex, slotIndex, photoId),
            ),

          setCrop: (spreadIndex, slotIndex, crop) =>
            void apply(
              setSlotCropOp(get().document, spreadIndex, slotIndex, crop),
            ),

          setText: (spreadIndex, slotIndex, input) =>
            void apply(
              setSlotTextOp(get().document, spreadIndex, slotIndex, input),
            ),

          clearSlot: (spreadIndex, slotIndex) =>
            void apply(clearSlotOp(get().document, spreadIndex, slotIndex)),

          switchLayout: (spreadIndex, layoutId) =>
            void apply(
              switchSpreadLayoutOp(get().document, spreadIndex, layoutId),
              // The new layout may have fewer slots than the selected index.
              (selection) => {
                selection.slotIndex = null;
              },
            ),

          addSpreadAfter: (index) =>
            void apply(
              addSpreadAfterOp(get().document, index, crypto.randomUUID()),
              (selection) => {
                selection.spreadIndex = index + 1;
                selection.slotIndex = null;
              },
            ),

          removeSpread: (index) =>
            void apply(removeSpreadOp(get().document, index), (selection) => {
              selection.slotIndex = null;
            }),

          moveSpread: (fromIndex, toIndex) =>
            void apply(
              moveSpreadOp(get().document, fromIndex, toIndex),
              (selection) => {
                // Keep the selection on the spread the user was editing.
                if (selection.spreadIndex === fromIndex) {
                  selection.spreadIndex = toIndex;
                }
              },
            ),
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
