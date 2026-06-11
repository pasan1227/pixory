import { CreateBookForm } from "@/components/create/CreateBookForm";
import { en } from "@/i18n/en";

// /create — marketing-grade pick flow: format, cover layout, cover colour,
// with a live cover preview. Server-rendered shell; the interactive picker is
// a small client island that posts to createBookAction.
export default function CreatePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-12 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {en.create.title}
        </h1>
        <p className="max-w-xl text-ink/70">{en.create.subtitle}</p>
      </header>
      <CreateBookForm />
    </main>
  );
}
