import { en } from "@/i18n/en";
import { BOOK_FORMATS } from "@/lib/schemas/book";
import { createBookAction } from "@/server/actions/books";

// Functional skeleton of the create flow — milestone 4 turns this into the
// marketing-grade format & cover-style picker.
export default function CreatePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {en.create.title}
        </h1>
        <p className="text-ink/70">{en.create.subtitle}</p>
      </header>
      <form action={createBookAction} className="flex flex-col gap-3">
        {BOOK_FORMATS.map((format) => (
          <button
            key={format}
            type="submit"
            name="format"
            value={format}
            className="rounded-xl border border-sand bg-white px-6 py-4 text-left font-medium transition-colors hover:border-terracotta"
          >
            {en.formats[format]}
          </button>
        ))}
      </form>
    </main>
  );
}
