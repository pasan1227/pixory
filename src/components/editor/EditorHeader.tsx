"use client";

import { ChevronLeft, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import type { PriceBreakdown } from "@/lib/pricing";
import { PAGES_PER_SPREAD } from "@/lib/print-specs";
import { quotePriceAction } from "@/server/actions/books";
import {
  useEditorHistory,
  useEditorStore,
  useEditorStoreApi,
} from "@/stores/editor-store";
import type { AutosaveStatus } from "@/components/editor/useAutosave";

const PRICE_DEBOUNCE_MS = 500;

const ICON_BUTTON_CLASS =
  "flex size-11 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors duration-150 motion-reduce:transition-none hover:bg-zinc-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta disabled:pointer-events-none disabled:opacity-40";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

// Cmd/Ctrl+Z → undo, Shift+Cmd/Ctrl+Z → redo. Ignored inside inputs,
// textareas and contenteditable so text editing keeps its native undo.
function useUndoRedoShortcuts(): void {
  const api = useEditorStoreApi();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "z") return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      const history = api.temporal.getState();
      if (event.shiftKey) {
        history.redo();
      } else {
        history.undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [api]);
}

function HistoryControls() {
  const { undo, redo, canUndo, canRedo } = useEditorHistory();
  useUndoRedoShortcuts();
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        aria-label={en.editor.undo}
        title={en.editor.undo}
        className={ICON_BUTTON_CLASS}
      >
        <Undo2 className="size-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        aria-label={en.editor.redo}
        title={en.editor.redo}
        className={ICON_BUTTON_CLASS}
      >
        <Redo2 className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

const SAVE_DOT_CLASS: Record<Exclude<AutosaveStatus, "idle">, string> = {
  saving: "bg-zinc-400 motion-safe:animate-pulse",
  saved: "bg-sage-deep",
  error: "bg-terracotta",
  conflict: "bg-terracotta-deep",
};

const SAVE_TEXT: Record<Exclude<AutosaveStatus, "idle">, string> = {
  saving: en.editor.saving,
  saved: en.editor.saved,
  error: en.editor.saveError,
  conflict: en.editor.saveConflict,
};

function SaveIndicator({ status }: Readonly<{ status: AutosaveStatus }>) {
  const alert = status === "error" || status === "conflict";
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-1.5">
      {status !== "idle" && (
        <>
          <span
            className={`size-2 shrink-0 rounded-full ${SAVE_DOT_CLASS[status]}`}
            aria-hidden="true"
          />
          <span
            title={SAVE_TEXT[status]}
            className={`sr-only sm:not-sr-only sm:max-w-44 sm:truncate sm:text-xs ${alert ? "sm:text-terracotta-deep" : "sm:text-zinc-600"}`}
          >
            {SAVE_TEXT[status]}
          </span>
        </>
      )}
    </p>
  );
}

// Server-quoted price — the client NEVER recomputes. Re-quotes (debounced
// 500ms) only when the page count changes; keeps the last good value on
// failure.
function PriceChip({
  initialPrice,
}: Readonly<{ initialPrice: PriceBreakdown }>) {
  const format = useEditorStore((s) => s.document.format);
  const pageCount =
    useEditorStore((s) => s.document.spreads.length) * PAGES_PER_SPREAD;
  const [price, setPrice] = useState(initialPrice);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      quotePriceAction({ format, pageCount })
        .then((result) => {
          if (!cancelled && result.ok) setPrice(result.value);
        })
        .catch(() => {
          // Keep the last good value.
        });
    }, PRICE_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [format, pageCount]);

  return (
    <p
      title={en.editor.deliveryNote}
      className="flex shrink-0 items-baseline gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5"
    >
      <span className="text-xs font-semibold whitespace-nowrap text-ink sm:text-sm">
        {formatLKR(price.subtotal)}
      </span>
      <span className="hidden text-xs whitespace-nowrap text-zinc-500 sm:inline">
        {en.editor.pages.replace("{count}", String(pageCount))}
      </span>
    </p>
  );
}

export function EditorHeader({
  initialPrice,
  saveStatus,
}: Readonly<{ initialPrice: PriceBreakdown; saveStatus: AutosaveStatus }>) {
  const title = useEditorStore((s) => s.document.cover.title);
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 sm:gap-3 sm:px-4">
      <Link
        href="/my-books"
        aria-label={en.myBooks.title}
        className={ICON_BUTTON_CLASS}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Link>
      <h1 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-ink sm:text-base">
        {title.trim() || en.editor.untitled}
      </h1>
      <SaveIndicator status={saveStatus} />
      <HistoryControls />
      <PriceChip initialPrice={initialPrice} />
    </header>
  );
}
