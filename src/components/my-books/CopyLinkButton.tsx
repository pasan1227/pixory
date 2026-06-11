"use client";

import { useEffect, useRef, useState } from "react";
import { en } from "@/i18n/en";

const COPIED_RESET_MS = 2000;

type CopyLinkButtonProps = Readonly<{ shareToken: string }>;

// Copies this book's one-time resume link (/resume/[shareToken]) to the
// clipboard and flips its label to a brief "copied" confirmation.
export function CopyLinkButton({ shareToken }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/resume/${shareToken}`,
      );
    } catch {
      return; // Clipboard unavailable (permissions, insecure context) — keep the label.
    }
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={en.myBooks.copyHint}
      className="inline-flex min-h-11 items-center rounded-full border border-sand bg-white px-4 py-2 text-sm font-medium transition-colors duration-150 hover:border-terracotta focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
    >
      {copied ? en.myBooks.copied : en.myBooks.copyLink}
    </button>
  );
}
