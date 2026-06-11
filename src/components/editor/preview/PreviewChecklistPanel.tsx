"use client";

import { ListChecks, X } from "lucide-react";
import { useState } from "react";
import { PreviewChecklist } from "@/components/editor/preview/PreviewChecklist";
import { en } from "@/i18n/en";
import type { CompletenessIssue } from "@/lib/completeness";

// Responsive shell for the checklist: a fixed side panel on lg+, a floating
// toggle button + bottom sheet below that. Both render the same
// PreviewChecklist content. z-indexes are local to the overlay's stacking
// context (the fixed z-50 dialog), so small values are safe here.

type PreviewChecklistPanelProps = Readonly<{
  issues: CompletenessIssue[];
  onGoTo: (pageIndex: number) => void;
  onFixIssue: (issue: CompletenessIssue) => void;
}>;

export function PreviewChecklistPanel({
  issues,
  onGoTo,
  onFixIssue,
}: PreviewChecklistPanelProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const title =
    issues.length > 0
      ? `${en.editor.preview.checklist} (${issues.length})`
      : en.editor.preview.checklist;
  // Jumping to a page closes the mobile sheet so the page is visible.
  const goToAndDismiss = (pageIndex: number) => {
    setMobileOpen(false);
    onGoTo(pageIndex);
  };

  return (
    <>
      <aside className="hidden w-80 shrink-0 overflow-y-auto p-4 lg:block">
        <div className="rounded-lg bg-paper p-3 text-ink shadow-lg">
          <PreviewChecklist
            issues={issues}
            onGoTo={onGoTo}
            onFixIssue={onFixIssue}
          />
        </div>
      </aside>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          className="fixed bottom-4 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-paper px-4 text-sm font-medium text-ink shadow-lg transition-colors duration-150 motion-reduce:transition-none hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
        >
          <ListChecks className="size-4" aria-hidden="true" />
          {title}
        </button>
        {mobileOpen && (
          <div className="fixed inset-x-0 bottom-0 z-20 flex max-h-[60vh] flex-col rounded-t-xl bg-paper text-ink shadow-lg">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sand py-1 pr-1 pl-4">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label={en.editor.panel.done}
                className="flex size-11 items-center justify-center rounded-md text-ink/70 transition-colors duration-150 motion-reduce:transition-none hover:bg-sand hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-3">
              <PreviewChecklist
                issues={issues}
                onGoTo={goToAndDismiss}
                onFixIssue={onFixIssue}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
