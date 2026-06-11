"use client";

import type { ReactNode } from "react";
import { LayoutPanel } from "@/components/editor/panel/LayoutPanel";
import { PhotoPanel } from "@/components/editor/panel/PhotoPanel";
import { TextPanel, type TextValue } from "@/components/editor/panel/TextPanel";
import { getSpreadLayout } from "@/data/layouts";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";
import { useEditorStore } from "@/stores/editor-store";
import type { SlotContent } from "@/types/book";
import type { SlotDef } from "@/types/layout";

type ContextPanelProps = Readonly<{
  photosById: Record<string, PhotoDto>;
  onRequestPhotoPick: (spreadIndex: number, slotIndex: number) => void;
  onDismiss?: () => void;
}>;

// Defaults for a text slot that hasn't been written into yet.
function textValueOf(content: SlotContent | undefined): TextValue {
  if (content !== undefined && content.kind === "text") {
    return { text: content.text, fontId: content.fontId, align: content.align };
  }
  return { text: "", fontId: "inter", align: "center" };
}

// Renders in both the desktop sidebar (w-full column) and the mobile bottom
// sheet; `onDismiss` is provided only by the sheet and adds the Done control.
export function ContextPanel({
  photosById,
  onRequestPhotoPick,
  onDismiss,
}: ContextPanelProps) {
  const doc = useEditorStore((s) => s.document);
  const slotIndex = useEditorStore((s) => s.selection.slotIndex);
  // After undo, selection.spreadIndex may point past the last spread.
  const spreadIndex = useEditorStore((s) =>
    Math.min(s.selection.spreadIndex, s.document.spreads.length - 1),
  );
  const switchLayout = useEditorStore((s) => s.switchLayout);
  const setCrop = useEditorStore((s) => s.setCrop);
  const setText = useEditorStore((s) => s.setText);
  const clearSlot = useEditorStore((s) => s.clearSlot);

  const spread = doc.spreads[spreadIndex];
  // A stale slot selection (e.g. undo restored a shorter layout) falls back
  // to layout mode rather than rendering against a missing slot.
  const layoutSlot: SlotDef | undefined =
    slotIndex === null
      ? undefined
      : getSpreadLayout(spread.layoutId).slots[slotIndex];

  let heading: string = en.editor.panel.layout;
  let body: ReactNode;
  if (slotIndex === null || layoutSlot === undefined) {
    body = (
      <LayoutPanel
        format={doc.format}
        currentLayoutId={spread.layoutId}
        onSelect={(layoutId) => switchLayout(spreadIndex, layoutId)}
      />
    );
  } else if (layoutSlot.type === "text") {
    heading = en.editor.panel.text;
    body = (
      <TextPanel
        value={textValueOf(spread.slots[slotIndex])}
        onChange={(next) => setText(spreadIndex, slotIndex, next)}
      />
    );
  } else {
    heading = en.editor.panel.photo;
    const content: SlotContent | undefined = spread.slots[slotIndex];
    const placement =
      content !== undefined && content.kind === "photo" ? content : null;
    body = (
      <PhotoPanel
        format={doc.format}
        layoutSlot={layoutSlot}
        placement={placement}
        photo={placement ? photosById[placement.photoId] : undefined}
        onCropChange={(crop) => setCrop(spreadIndex, slotIndex, crop)}
        onReplace={() => onRequestPhotoPick(spreadIndex, slotIndex)}
        onRemove={() => clearSlot(spreadIndex, slotIndex)}
      />
    );
  }

  return (
    <section
      aria-label={heading}
      className="flex w-full flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{heading}</h2>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 rounded-md px-2 py-1 text-xs font-semibold text-terracotta transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
          >
            {en.editor.panel.done}
          </button>
        )}
      </header>
      {body}
    </section>
  );
}
