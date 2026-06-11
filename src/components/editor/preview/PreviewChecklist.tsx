"use client";

import { CheckCircle2 } from "lucide-react";
import { en } from "@/i18n/en";
import { issueSeverity, type CompletenessIssue } from "@/lib/completeness";

// Checklist content rendered inside the bg-paper panel (desktop aside) and
// the mobile bottom sheet. Clicking the row text is the Fix affordance
// (onFixIssue — the shell exits preview and selects the slot); the trailing
// "View" button jumps the preview to the page the issue lives on.

type PreviewChecklistProps = Readonly<{
  issues: CompletenessIssue[];
  onGoTo: (pageIndex: number) => void;
  onFixIssue: (issue: CompletenessIssue) => void;
}>;

// Preview page index for an issue: cover -> 0, spread n -> n + 1.
function issuePageIndex(issue: CompletenessIssue): number {
  return issue.target === "cover" ? 0 : issue.spreadIndex + 1;
}

function locationLabel(issue: CompletenessIssue): string {
  if (issue.target === "cover") return en.editor.preview.coverLabel;
  return en.editor.preview.spreadLabel.replace(
    "{n}",
    String(issue.spreadIndex + 1),
  );
}

function IssueRow({
  issue,
  onGoTo,
  onFixIssue,
}: Readonly<{
  issue: CompletenessIssue;
  onGoTo: (pageIndex: number) => void;
  onFixIssue: (issue: CompletenessIssue) => void;
}>) {
  const tint =
    issueSeverity(issue.kind) === "error" ? "text-terracotta" : "text-ink/70";
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onFixIssue(issue)}
        className="min-h-11 min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors duration-150 motion-reduce:transition-none hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
      >
        <span className={`block text-sm font-medium ${tint}`}>
          {en.editor.preview.issues[issue.kind]}
        </span>
        <span className="block text-xs text-ink/60">
          {locationLabel(issue)}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onGoTo(issuePageIndex(issue))}
        className="min-h-11 shrink-0 rounded-md px-3 text-xs font-medium text-ink underline-offset-2 transition-colors duration-150 motion-reduce:transition-none hover:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
      >
        {en.editor.preview.goTo}
      </button>
    </li>
  );
}

export function PreviewChecklist({
  issues,
  onGoTo,
  onFixIssue,
}: PreviewChecklistProps) {
  if (issues.length === 0) {
    return (
      <p className="flex items-start gap-2 rounded-md border-l-2 border-sage bg-sage/10 p-3 text-sm text-ink">
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-sage"
          aria-hidden="true"
        />
        {en.editor.preview.allGood}
      </p>
    );
  }
  return (
    <div>
      <h3 className="px-2 text-sm font-semibold text-ink">
        {en.editor.preview.issuesTitle.replace(
          "{count}",
          String(issues.length),
        )}
      </h3>
      <ul className="mt-2 space-y-1">
        {issues.map((issue) => (
          <IssueRow
            // Stable identity: an issue is unique per (target, spread, slot,
            // kind) — checkCompleteness emits at most one of each.
            key={`${issue.target}-${issue.spreadIndex}-${issue.slotIndex}-${issue.kind}`}
            issue={issue}
            onGoTo={onGoTo}
            onFixIssue={onFixIssue}
          />
        ))}
      </ul>
    </div>
  );
}
