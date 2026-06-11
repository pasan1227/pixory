import Link from "next/link";
import { en } from "@/i18n/en";

// Placeholder home page — the full marketing site lands in milestone 7. The
// minimal header already links the live /create and /my-books routes.
export default function Home() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-display text-xl font-semibold tracking-tight"
        >
          {en.brand.name}
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/my-books"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink/70 transition-colors duration-150 hover:text-ink motion-reduce:transition-none"
          >
            {en.myBooks.title}
          </Link>
          <Link
            href="/create"
            className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-5 py-2 text-sm font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
          >
            {en.create.title}
          </Link>
        </nav>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-5xl font-semibold tracking-tight">
          {en.brand.name}
        </h1>
        <p className="max-w-md text-lg text-ink/70">{en.brand.tagline}</p>
      </main>
    </>
  );
}
