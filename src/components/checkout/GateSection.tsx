"use client";

import Link from "next/link";
import { useMemo } from "react";
import { en } from "@/i18n/en";
import { evaluateCheckoutGate, slotIssueKey } from "@/lib/checkout-gate";
import type { CompletenessIssue } from "@/lib/completeness";

// Presentation copy of the checkout gate — the server re-evaluates the same
// pure function on submit, so this is display + confirmation UI only.

function issueLocation(issue: CompletenessIssue): string {
  const location =
    issue.target === "cover"
      ? en.checkout.gate.locationCover
      : en.checkout.gate.locationSpread.replace(
          "{n}",
          String(issue.spreadIndex + 1),
        );
  if (issue.slotIndex < 0) return location;
  return `${location}, ${en.checkout.gate.slotLabel.replace("{n}", String(issue.slotIndex + 1))}`;
}

function issueKey(issue: CompletenessIssue): string {
  return `${issue.kind}:${slotIssueKey(issue)}`;
}

function BlockersCard({
  blockers,
  editorHref,
}: Readonly<{ blockers: readonly CompletenessIssue[]; editorHref: string }>) {
  return (
    <section className="rounded-2xl border border-terracotta/40 bg-terracotta/10 p-4 sm:p-5">
      <h2 className="font-semibold text-terracotta-deep">
        {en.checkout.gate.blockersTitle}
      </h2>
      <p className="mt-1 text-sm text-ink/70">{en.checkout.gate.blockersHint}</p>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm text-ink">
        {blockers.map((issue) => (
          <li
            key={issueKey(issue)}
            className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5"
          >
            <span className="font-medium">
              {en.editor.preview.issues[issue.kind]}
            </span>
            <span className="text-ink/60">{issueLocation(issue)}</span>
          </li>
        ))}
      </ul>
      <Link
        href={editorHref}
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-terracotta px-5 text-sm font-medium text-terracotta-deep transition-colors duration-150 hover:bg-terracotta hover:text-paper focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
      >
        {en.checkout.backToEditor}
      </Link>
    </section>
  );
}

function EmptySlotsCard({
  emptySlots,
  confirmed,
  onToggle,
}: Readonly<{
  emptySlots: readonly CompletenessIssue[];
  confirmed: readonly string[];
  onToggle: (key: string) => void;
}>) {
  return (
    <section className="rounded-2xl border border-sand bg-sand/40 p-4 sm:p-5">
      <h2 className="font-semibold text-ink">{en.checkout.gate.emptyTitle}</h2>
      <p className="mt-1 text-sm text-ink/70">{en.checkout.gate.emptyHint}</p>
      <ul className="mt-2 flex flex-col">
        {emptySlots.map((issue) => {
          const key = slotIssueKey(issue);
          return (
            <li key={key}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={confirmed.includes(key)}
                  onChange={() => onToggle(key)}
                  className="size-5 shrink-0 rounded accent-terracotta"
                />
                <span className="flex-1 text-sm text-ink">
                  {issueLocation(issue)}
                </span>
                <span className="text-xs text-ink/60">
                  {en.checkout.gate.confirmBlank}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function WarningsList({
  warnings,
}: Readonly<{ warnings: readonly CompletenessIssue[] }>) {
  return (
    <section className="px-1">
      <h2 className="text-sm font-semibold text-ink/60">
        {en.checkout.gate.warningsTitle}
      </h2>
      <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ink/60">
        {warnings.map((issue) => (
          <li
            key={issueKey(issue)}
            className="flex flex-wrap items-baseline justify-between gap-x-3"
          >
            <span>{en.editor.preview.issues[issue.kind]}</span>
            <span>{issueLocation(issue)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function GateSection({
  issues,
  confirmed,
  onToggle,
  editorHref,
}: Readonly<{
  issues: readonly CompletenessIssue[];
  confirmed: readonly string[];
  onToggle: (key: string) => void;
  editorHref: string;
}>) {
  const gate = useMemo(
    () => evaluateCheckoutGate(issues, confirmed),
    [issues, confirmed],
  );
  // All empty slots stay listed (checked ones included) so a confirmation
  // can be unticked — gate.unconfirmedEmpty alone would drop them.
  const emptySlots = useMemo(
    () => issues.filter((issue) => issue.kind === "empty-slot"),
    [issues],
  );
  if (issues.length === 0) {
    return (
      <p className="rounded-2xl border border-sage/50 bg-sage/15 px-4 py-3 text-sm font-medium text-sage-deep">
        {en.checkout.gate.ready}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {gate.blockers.length > 0 && (
        <BlockersCard blockers={gate.blockers} editorHref={editorHref} />
      )}
      {emptySlots.length > 0 && (
        <EmptySlotsCard
          emptySlots={emptySlots}
          confirmed={confirmed}
          onToggle={onToggle}
        />
      )}
      {gate.warnings.length > 0 && <WarningsList warnings={gate.warnings} />}
    </div>
  );
}
