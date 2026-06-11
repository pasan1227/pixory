"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { en } from "@/i18n/en";
import type { PhotoDto } from "@/lib/schemas/photo";

// Two-step confirm auto-disarms after this long so a stale "Replace current
// pages?" never lingers as a one-click landmine.
const DISARM_MS = 4000;

// "Fill my book automatically" block at the top of the photo tray. Dumb on
// purpose: the shell maps photos, runs the distribution, and reports the
// leftover count back down — this component only renders and confirms.
export function AutoCreateCta({
  photos,
  bookIsEmpty,
  leftoverCount,
  onAutoCreate,
}: Readonly<{
  photos: PhotoDto[];
  bookIsEmpty: boolean;
  leftoverCount: number | null;
  onAutoCreate: (photos: PhotoDto[]) => void;
}>) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), DISARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  const handleClick = () => {
    // An empty book has nothing to lose — apply on the first click. Otherwise
    // the first click arms an inline confirm and the second click applies.
    if (bookIsEmpty || armed) {
      setArmed(false);
      onAutoCreate(photos);
      return;
    }
    setArmed(true);
  };

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-sage/40 bg-sage/15 p-3">
      <h3 className="text-sm font-semibold text-ink">{en.tray.autoCreate}</h3>
      <p className="text-xs text-zinc-600">{en.tray.autoCreateHint}</p>
      <button
        type="button"
        onClick={handleClick}
        className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-sage-deep px-3 py-2 text-sm font-semibold text-paper transition duration-150 motion-reduce:transition-none hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2"
      >
        <Sparkles className="size-4 shrink-0" aria-hidden="true" />
        {armed ? en.tray.autoCreateConfirm : en.tray.autoCreateAction}
      </button>
      {armed && (
        <p className="text-xs text-terracotta-deep">
          {en.tray.autoCreateConfirmHint}
        </p>
      )}
      {/* Polite live region so "N photos didn't fit" reaches screen readers. */}
      <p role="status" aria-live="polite" className="text-xs text-zinc-600">
        {leftoverCount !== null &&
          en.tray.autoCreateLeftover.replace("{count}", String(leftoverCount))}
      </p>
    </div>
  );
}
