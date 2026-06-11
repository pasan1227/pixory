"use client";

import { Images, SlidersHorizontal, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ContextPanel } from "@/components/editor/ContextPanel";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { Filmstrip } from "@/components/editor/Filmstrip";
import { PhotoPickerSheet } from "@/components/editor/PhotoPickerSheet";
import { PhotoTray } from "@/components/editor/PhotoTray";
import type { PickTarget } from "@/components/editor/pick-target";
import { SpreadCanvas } from "@/components/editor/SpreadCanvas";
import { useAutosave } from "@/components/editor/useAutosave";
import { useUploadManager } from "@/components/editor/useUploadManager";
import { en } from "@/i18n/en";
import { countPhotoUsage } from "@/lib/photo-usage";
import type { PriceBreakdown } from "@/lib/pricing";
import type { PhotoDto } from "@/lib/schemas/photo";
import { EditorStoreProvider, useEditorStore } from "@/stores/editor-store";
import type { BookDocument } from "@/types/book";

// Bottom drawer for mobile (<lg). Stays mounted so the 150ms slide can play;
// the closed state is `inert`, removing it from the tab order and the
// accessibility tree while keeping it animatable.
function MobileSheet({
  open,
  title,
  onClose,
  children,
}: Readonly<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}>) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes; focus moves into the dialog on open. Listener exists only
  // while the sheet is open. Bubble phase on purpose: when the photo picker
  // is stacked on top, its CAPTURE-phase window listener consumes Escape
  // (stopPropagation) before any bubble listener runs, so this handler never
  // double-closes — no visible-modal-on-top check is needed here.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 transition-opacity duration-150 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`absolute inset-x-0 bottom-0 flex max-h-[70vh] flex-col rounded-t-xl bg-zinc-50 shadow-lg outline-none transition-transform duration-150 motion-reduce:transition-none ${open ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 py-1 pr-1 pl-4">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={en.editor.panel.done}
            className="flex size-11 items-center justify-center rounded-md text-zinc-600 transition-colors duration-150 motion-reduce:transition-none hover:bg-zinc-200 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
}

const BAR_BUTTON_CLASS =
  "flex h-14 flex-1 items-center justify-center gap-2 text-sm font-medium text-ink transition-colors duration-150 motion-reduce:transition-none hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta";

function MobileActionBar({
  onOpenTray,
  onOpenPanel,
}: Readonly<{ onOpenTray: () => void; onOpenPanel: () => void }>) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-zinc-50 lg:hidden">
      <button type="button" onClick={onOpenTray} className={BAR_BUTTON_CLASS}>
        <Images className="size-5" aria-hidden="true" />
        {en.tray.title}
      </button>
      <button type="button" onClick={onOpenPanel} className={BAR_BUTTON_CLASS}>
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        {en.editor.panel.layout}
      </button>
    </nav>
  );
}

// Everything that reads the editor store lives here, INSIDE the provider.
function EditorChrome({
  bookId,
  updatedAt,
  initialPhotos,
  initialPrice,
}: Readonly<{
  bookId: string;
  updatedAt: string;
  initialPhotos: PhotoDto[];
  initialPrice: PriceBreakdown;
}>) {
  const manager = useUploadManager({ bookId, initialPhotos });
  const bookDocument = useEditorStore((s) => s.document);
  const slotIndex = useEditorStore((s) => s.selection.slotIndex);
  const selectSlot = useEditorStore((s) => s.selectSlot);
  const placePhoto = useEditorStore((s) => s.placePhoto);
  const placeCoverPhoto = useEditorStore((s) => s.placeCoverPhoto);
  const { status } = useAutosave({ bookId, initialUpdatedAt: updatedAt });

  const [pickTarget, setPickTarget] = useState<PickTarget | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const usedCounts = useMemo(() => countPhotoUsage(bookDocument), [bookDocument]);
  const photosById = useMemo(
    () => Object.fromEntries(manager.photos.map((photo) => [photo.id, photo])),
    [manager.photos],
  );

  // Selecting a slot on mobile auto-opens the panel sheet (it is only
  // rendered <lg; both close paths clear the selection again, so the derived
  // value drops back to false). selection.slotIndex is shared by the cover
  // and spread views, so cover slot selection auto-opens the sheet too.
  const panelSheetOpen = panelOpen || slotIndex !== null;

  const requestPhotoPick = useCallback(
    (target: PickTarget) => setPickTarget(target),
    [],
  );
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    selectSlot(null);
  }, [selectSlot]);
  // Stable so MobileSheet's Escape-listener effect doesn't re-register on
  // every render while the sheet is open.
  const closeTray = useCallback(() => setTrayOpen(false), []);
  const handlePick = (photoId: string) => {
    if (pickTarget?.view === "cover") {
      placeCoverPhoto(pickTarget.slotIndex, photoId);
    } else if (pickTarget) {
      placePhoto(pickTarget.spreadIndex, pickTarget.slotIndex, photoId);
    }
    setPickTarget(null);
  };

  return (
    <div className="flex h-dvh flex-col">
      <EditorHeader initialPrice={initialPrice} saveStatus={status} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-3 lg:block">
          <PhotoTray manager={manager} usedCounts={usedCounts} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <SpreadCanvas
              photosById={photosById}
              onRequestPhotoPick={requestPhotoPick}
            />
          </div>
          <Filmstrip photosById={photosById} />
          {/* Spacer so the fixed mobile action bar never covers the strip. */}
          <div className="h-14 shrink-0 lg:hidden" aria-hidden="true" />
        </main>
        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50 lg:block">
          <ContextPanel
            photosById={photosById}
            onRequestPhotoPick={requestPhotoPick}
          />
        </aside>
      </div>
      <MobileActionBar
        onOpenTray={() => setTrayOpen(true)}
        onOpenPanel={() => setPanelOpen(true)}
      />
      <MobileSheet open={trayOpen} title={en.tray.title} onClose={closeTray}>
        <PhotoTray manager={manager} usedCounts={usedCounts} />
      </MobileSheet>
      <MobileSheet
        open={panelSheetOpen}
        title={en.editor.panel.layout}
        onClose={closePanel}
      >
        <ContextPanel
          photosById={photosById}
          onRequestPhotoPick={requestPhotoPick}
          onDismiss={closePanel}
        />
      </MobileSheet>
      <PhotoPickerSheet
        open={pickTarget !== null}
        photos={manager.photos}
        usedCounts={usedCounts}
        onPick={handlePick}
        onClose={() => setPickTarget(null)}
      />
    </div>
  );
}

export function EditorShell({
  bookId,
  document,
  updatedAt,
  initialPhotos,
  initialPrice,
}: Readonly<{
  bookId: string;
  document: BookDocument;
  updatedAt: string;
  initialPhotos: PhotoDto[];
  initialPrice: PriceBreakdown;
}>) {
  return (
    <EditorStoreProvider initialDocument={document}>
      <EditorChrome
        bookId={bookId}
        updatedAt={updatedAt}
        initialPhotos={initialPhotos}
        initialPrice={initialPrice}
      />
    </EditorStoreProvider>
  );
}
