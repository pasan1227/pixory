"use client";

import { Plus } from "lucide-react";
import { memo } from "react";
import { en } from "@/i18n/en";
import type { SlotType } from "@/types/layout";

// An unfilled slot. Interactive surfaces (editor canvas) show an add
// affordance; read-only surfaces (thumbnails, preview) show a quiet block.

type EmptySlotContentProps = Readonly<{
  slotType: SlotType;
  interactive: boolean;
}>;

function EmptySlotContentImpl({ slotType, interactive }: EmptySlotContentProps) {
  if (!interactive) {
    return <div className="absolute inset-0 bg-sand/60" />;
  }
  const label = slotType === "photo" ? en.editor.slot.addPhoto : en.editor.slot.addText;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 border border-dashed border-zinc-300 text-zinc-500 group-hover:border-terracotta group-hover:text-terracotta motion-safe:transition-colors motion-safe:duration-150">
      <Plus size={16} aria-hidden="true" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

export const EmptySlotContent = memo(EmptySlotContentImpl);
