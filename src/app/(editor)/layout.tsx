import type { ReactNode } from "react";

// Editor route group layout — cool zinc chrome so the book page (white/paper)
// is always the warmest thing on screen.
export default function EditorLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return <div className="flex min-h-dvh flex-col bg-zinc-100">{children}</div>;
}
