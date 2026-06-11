"use client";

import { memo } from "react";
import { en } from "@/i18n/en";

// Print-resolution warning chip on a photo slot. "ok" renders nothing — the
// caller only mounts this for "warning" | "blocked" (policy in src/lib/dpi.ts).

type DpiBadgeProps = Readonly<{ status: "warning" | "blocked" }>;

function DpiBadgeImpl({ status }: DpiBadgeProps) {
  const blocked = status === "blocked";
  return (
    <span
      className={`pointer-events-none absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
        blocked ? "bg-terracotta text-paper" : "border border-zinc-300 bg-sand text-ink"
      }`}
    >
      {blocked ? en.dpi.blocked : en.dpi.warning}
    </span>
  );
}

export const DpiBadge = memo(DpiBadgeImpl);
