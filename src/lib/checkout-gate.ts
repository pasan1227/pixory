import {
  issueSeverity,
  type CompletenessIssue,
} from "@/lib/completeness";

// ---------------------------------------------------------------------------
// The checkout validation gate (CLAUDE.md DPI policy):
// - blocked-res (< 100 DPI) and missing-photo issues ALWAYS block.
// - empty photo slots block unless the customer explicitly confirmed each
//   one as intentionally blank.
// - everything else (low-res 100–149, empty text, missing title) warns only.
// Pure and shared verbatim by the checkout UI and the server action — the
// server recomputes it on submit; the client copy is presentation.
// ---------------------------------------------------------------------------

export interface CheckoutGateResult {
  ok: boolean;
  // Hard blockers: must be fixed in the editor.
  blockers: CompletenessIssue[];
  // Empty photo slots awaiting an explicit "leave blank" confirmation.
  unconfirmedEmpty: CompletenessIssue[];
  warnings: CompletenessIssue[];
}

export function slotIssueKey(issue: CompletenessIssue): string {
  return `${issue.target}:${issue.spreadIndex}:${issue.slotIndex}`;
}

export function evaluateCheckoutGate(
  issues: readonly CompletenessIssue[],
  confirmedBlank: readonly string[],
): CheckoutGateResult {
  const confirmed = new Set(confirmedBlank);
  const blockers: CompletenessIssue[] = [];
  const unconfirmedEmpty: CompletenessIssue[] = [];
  const warnings: CompletenessIssue[] = [];
  for (const issue of issues) {
    if (issue.kind === "blocked-res" || issue.kind === "missing-photo") {
      blockers.push(issue);
    } else if (issue.kind === "empty-slot") {
      if (!confirmed.has(slotIssueKey(issue))) unconfirmedEmpty.push(issue);
    } else if (issueSeverity(issue.kind) === "warning") {
      warnings.push(issue);
    } else {
      // missing-title is technically "error" severity for the badge, but the
      // spec gates checkout only on resolution and empty slots.
      warnings.push(issue);
    }
  }
  return {
    ok: blockers.length === 0 && unconfirmedEmpty.length === 0,
    blockers,
    unconfirmedEmpty,
    warnings,
  };
}
