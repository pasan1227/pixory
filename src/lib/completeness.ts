import { getCoverLayout, getSpreadLayout } from "@/data/layouts";
import { dpiStatus, effectiveDpi } from "@/lib/dpi";
import { PRINT_SPECS, slotPhysicalSizeMm } from "@/lib/print-specs";
import type { BookDocument, CoverSlot, SlotContent } from "@/types/book";

// ---------------------------------------------------------------------------
// Completeness checks — one pure pass over the document that powers the
// preview checklist (milestone 5) AND the checkout validation gate
// (milestone 6). Issue order is stable: title, cover slots, then spreads in
// page order, slots in reading order.
// ---------------------------------------------------------------------------

export interface PhotoDims {
  width: number;
  height: number;
}

export type IssueKind =
  | "missing-title"
  | "empty-slot" // photo-type slot with nothing in it
  | "empty-text" // text-type slot empty or whitespace-only
  | "missing-photo" // placed photoId no longer among the book's photos
  | "low-res" // 100–149 effective DPI: warns
  | "blocked-res"; // < 100 effective DPI: blocks checkout

export interface CompletenessIssue {
  kind: IssueKind;
  target: "cover" | "spread";
  // Spread position for target "spread"; 0 for cover issues.
  spreadIndex: number;
  // Slot position; -1 for missing-title.
  slotIndex: number;
  dpi: number | null;
}

// Checkout blockers vs. soft warnings (milestone 6 consumes this split;
// empty photo slots block unless explicitly confirmed blank per slot).
export function issueSeverity(kind: IssueKind): "error" | "warning" {
  return kind === "low-res" || kind === "empty-text" ? "warning" : "error";
}

function photoIssue(
  photoId: string,
  crop: Parameters<typeof effectiveDpi>[2],
  physical: { widthMm: number; heightMm: number },
  photoDims: Record<string, PhotoDims>,
): { kind: IssueKind; dpi: number | null } | null {
  const dims = photoDims[photoId];
  if (!dims) return { kind: "missing-photo", dpi: null };
  const dpi = effectiveDpi(dims, physical, crop);
  const status = dpiStatus(dpi);
  if (status === "blocked") return { kind: "blocked-res", dpi };
  if (status === "warning") return { kind: "low-res", dpi };
  return null;
}

function coverIssues(
  doc: BookDocument,
  photoDims: Record<string, PhotoDims>,
): CompletenessIssue[] {
  const spec = PRINT_SPECS[doc.format];
  const layout = getCoverLayout(doc.cover.layoutId);
  const issues: CompletenessIssue[] = [];
  layout.photoSlots.forEach((rect, slotIndex) => {
    const slot: CoverSlot = doc.cover.photoSlots[slotIndex] ?? { kind: "empty" };
    const base = { target: "cover" as const, spreadIndex: 0, slotIndex };
    if (slot.kind !== "photo") {
      issues.push({ ...base, kind: "empty-slot", dpi: null });
      return;
    }
    // Cover rects are page-normalized — never slotPhysicalSizeMm here.
    const physical = {
      widthMm: rect.w * spec.pageWidthMm,
      heightMm: rect.h * spec.pageHeightMm,
    };
    const issue = photoIssue(slot.photoId, slot.crop, physical, photoDims);
    if (issue) issues.push({ ...base, ...issue });
  });
  return issues;
}

function slotIssue(
  doc: BookDocument,
  spreadIndex: number,
  slotIndex: number,
  content: SlotContent,
  photoDims: Record<string, PhotoDims>,
): CompletenessIssue | null {
  const spread = doc.spreads[spreadIndex];
  const rect = getSpreadLayout(spread.layoutId).slots[slotIndex];
  if (!rect) return null;
  const base = { target: "spread" as const, spreadIndex, slotIndex };
  if (rect.type === "text") {
    const empty = content.kind !== "text" || content.text.trim() === "";
    return empty ? { ...base, kind: "empty-text", dpi: null } : null;
  }
  if (content.kind !== "photo") {
    return { ...base, kind: "empty-slot", dpi: null };
  }
  const physical = slotPhysicalSizeMm(doc.format, rect);
  const issue = photoIssue(content.photoId, content.crop, physical, photoDims);
  return issue ? { ...base, ...issue } : null;
}

export function checkCompleteness(
  doc: BookDocument,
  photoDims: Record<string, PhotoDims>,
): CompletenessIssue[] {
  const issues: CompletenessIssue[] = [];
  if (doc.cover.title.trim() === "") {
    issues.push({
      kind: "missing-title",
      target: "cover",
      spreadIndex: 0,
      slotIndex: -1,
      dpi: null,
    });
  }
  issues.push(...coverIssues(doc, photoDims));
  doc.spreads.forEach((spread, spreadIndex) => {
    spread.slots.forEach((content, slotIndex) => {
      const issue = slotIssue(doc, spreadIndex, slotIndex, content, photoDims);
      if (issue) issues.push(issue);
    });
  });
  return issues;
}

// Checkout gate summary (milestone 6): errors block, warnings don't.
export function countBySeverity(issues: CompletenessIssue[]): {
  errors: number;
  warnings: number;
} {
  let errors = 0;
  let warnings = 0;
  for (const issue of issues) {
    if (issueSeverity(issue.kind) === "error") errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}
