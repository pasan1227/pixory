import { en } from "@/i18n/en";

// Placeholder home page — the full marketing site lands in milestone 7.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-5xl font-semibold tracking-tight">
        {en.brand.name}
      </h1>
      <p className="max-w-md text-lg text-ink/70">{en.brand.tagline}</p>
    </main>
  );
}
