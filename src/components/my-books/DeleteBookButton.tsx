"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { en } from "@/i18n/en";
import { deleteBookAction } from "@/server/actions/books";

// Two-step inline confirm (no window.confirm): the first click arms the
// button (same button, emphasized confirm styling); a second click within the
// window actually deletes. The armed state disarms itself after a pause.
const DISARM_AFTER_MS = 4000;

type DeleteBookButtonProps = Readonly<{ bookId: string }>;

export function DeleteBookButton({ bookId }: DeleteBookButtonProps) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function arm(): void {
    setFailed(false);
    setArmed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setArmed(false), DISARM_AFTER_MS);
  }

  async function confirmDelete(): Promise<void> {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPending(true);
    try {
      const result = await deleteBookAction({ bookId });
      if (result.ok) {
        // The card disappears with the refreshed server payload.
        router.refresh();
        return;
      }
    } catch {
      // A rejected action (network failure, server crash) takes the same
      // failure path as an { ok: false } result — otherwise the button would
      // be stuck disabled in the pending state.
    }
    setPending(false);
    setArmed(false);
    setFailed(true);
  }

  function handleClick(): void {
    if (pending) return;
    if (!armed) {
      arm();
      return;
    }
    void confirmDelete();
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={armed}
        className={`inline-flex min-h-11 items-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none disabled:opacity-50 motion-reduce:transition-none ${
          armed
            ? "bg-terracotta-deep text-paper hover:bg-terracotta"
            : "border border-sand bg-white text-ink/70 hover:border-terracotta-deep hover:text-terracotta-deep"
        }`}
      >
        {en.myBooks.delete}
      </button>
      {failed ? (
        <span role="alert" className="text-xs text-terracotta-deep">
          {en.myBooks.deleteFailed}
        </span>
      ) : null}
    </span>
  );
}
