import {
  Bebas_Neue,
  Caveat,
  Lora,
  Pacifico,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";
import type { CSSProperties, ReactNode } from "react";

// The create flow shows a live cover preview with a font picker, so it needs
// the curated in-book fonts. Loading them is scoped to /create only — other
// marketing routes never pay for them, and no editor JS (stores, exifr, dnd)
// crosses into this route. Fraunces and Inter are already loaded globally;
// their --font-book-* variables alias the root variables instead of loading a
// second copy, mirroring the (editor) layout. The 700 weights back bold titles.
const lora = Lora({
  variable: "--font-book-lora",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-book-caveat",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-book-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-book-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bebas = Bebas_Neue({
  variable: "--font-book-bebas",
  subsets: ["latin"],
  weight: ["400"],
});

const pacifico = Pacifico({
  variable: "--font-book-pacifico",
  subsets: ["latin"],
  weight: ["400"],
});

const bookFontClasses = `${lora.variable} ${caveat.variable} ${playfair.variable} ${spaceGrotesk.variable} ${bebas.variable} ${pacifico.variable}`;

const bookFontAliases: CSSProperties = {
  ["--font-book-fraunces" as string]: "var(--font-fraunces)",
  ["--font-book-inter" as string]: "var(--font-inter)",
};

// display:contents keeps <main>'s flex chain intact (no extra box) while still
// cascading the font CSS variables to the preview below.
export default function CreateLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className={`${bookFontClasses} contents`}
      style={bookFontAliases}
    >
      {children}
    </div>
  );
}
