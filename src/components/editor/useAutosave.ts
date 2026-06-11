"use client";

import { useEffect, useRef, useState } from "react";
import {
  saveBookDocumentAction,
  type SaveBookResult,
} from "@/server/actions/books";
import { useEditorStoreApi } from "@/stores/editor-store";
import type { BookDocument } from "@/types/book";

const AUTOSAVE_DEBOUNCE_MS = 1500;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

// Debounced last-write-wins autosave. Watches the store's document by
// reference (the base store, not the temporal one — so undo/redo trigger
// saves too), waits 1.5s after the LAST change, and keeps at most one save in
// flight with a trailing re-save if the document moved on meanwhile. Each ok
// save chains its updatedAt into the next baseUpdatedAt; a "conflict" means
// another tab owns the book now, so autosaving stops entirely until reload.
export function useAutosave(input: {
  bookId: string;
  initialUpdatedAt: string;
}): { status: AutosaveStatus } {
  const { bookId, initialUpdatedAt } = input;
  const api = useEditorStoreApi();
  const [status, setStatus] = useState<AutosaveStatus>("idle");

  const baseUpdatedAtRef = useRef(initialUpdatedAt);
  const latestDocRef = useRef<BookDocument | null>(null);
  const savedDocRef = useRef<BookDocument | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const stoppedRef = useRef(false);

  useEffect(() => {
    // The document present at mount is the persisted baseline — no save
    // happens until the first real edit changes the reference.
    savedDocRef.current ??= api.getState().document;
    latestDocRef.current ??= savedDocRef.current;

    function clearTimer(): void {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function settle(doc: BookDocument, result: SaveBookResult | null): void {
      if (result?.ok) {
        baseUpdatedAtRef.current = result.updatedAt;
        savedDocRef.current = doc;
        // Trailing re-save: the document changed while this save was in
        // flight and no new debounce window is pending.
        if (latestDocRef.current !== doc && timerRef.current === null) {
          void save();
          return;
        }
        if (timerRef.current === null) setStatus("saved");
        return;
      }
      if (result !== null && result.error === "conflict") {
        // Another tab owns the book now — stop entirely; the user must reload.
        stoppedRef.current = true;
        clearTimer();
        setStatus("conflict");
        return;
      }
      // not_found / invalid_input / thrown — retried on the next edit.
      setStatus("error");
    }

    async function save(): Promise<void> {
      const doc = latestDocRef.current;
      if (doc === null) return;
      if (doc === savedDocRef.current) {
        // e.g. edit + undo within one debounce window — nothing to persist.
        setStatus("saved");
        return;
      }
      inFlightRef.current = true;
      let result: SaveBookResult | null = null;
      try {
        result = await saveBookDocumentAction({
          bookId,
          document: doc,
          baseUpdatedAt: baseUpdatedAtRef.current,
        });
      } catch {
        result = null;
      }
      inFlightRef.current = false;
      settle(doc, result);
    }

    function onDocumentChange(doc: BookDocument): void {
      latestDocRef.current = doc;
      if (stoppedRef.current) return;
      setStatus("saving");
      clearTimer();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        // If a save is mid-flight, its completion handles the trailing
        // re-save — never run two at once.
        if (!inFlightRef.current) void save();
      }, AUTOSAVE_DEBOUNCE_MS);
    }

    const unsubscribe = api.subscribe((state, prevState) => {
      if (state.document !== prevState.document) {
        onDocumentChange(state.document);
      }
    });
    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [api, bookId]);

  return { status };
}
