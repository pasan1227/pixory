import { Caveat, Lora } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";

// The curated in-book fonts load ONLY here — marketing routes never pay for
// them. Fraunces and Inter are already loaded globally; their --font-book-*
// variables alias the root variables instead of loading second copies.
const lora = Lora({
  variable: "--font-book-lora",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const caveat = Caveat({
  variable: "--font-book-caveat",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const bookFontAliases: CSSProperties = {
  ["--font-book-fraunces" as string]: "var(--font-fraunces)",
  ["--font-book-inter" as string]: "var(--font-inter)",
};

// Editor route group layout — cool zinc chrome so the book page (white/paper)
// is always the warmest thing on screen.
export default function EditorLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className={`${lora.variable} ${caveat.variable} flex min-h-dvh flex-col bg-zinc-100`}
      style={bookFontAliases}
    >
      {children}
    </div>
  );
}
