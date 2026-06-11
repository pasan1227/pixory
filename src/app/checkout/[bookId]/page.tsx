import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { en } from "@/i18n/en";
import { checkCompleteness, type PhotoDims } from "@/lib/completeness";
import { priceBook } from "@/lib/pricing";
import { PAGES_PER_SPREAD } from "@/lib/print-specs";
import { findOwnedBook } from "@/server/repositories/books";
import { listPhotosByBook } from "@/server/repositories/photos";
import { getSessionToken } from "@/server/session";

export const metadata: Metadata = { title: en.checkout.metaTitle };

// Checkout entry (RSC): ownership check, server-computed completeness issues
// and the initial price quote (no district yet — delivery appears once the
// customer picks one). The interactive form is a client island that receives
// serializable props only; the server re-runs the gate on submit.
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const sessionToken = await getSessionToken();
  if (!sessionToken) notFound();

  const book = await findOwnedBook(bookId, sessionToken);
  if (!book) notFound();

  const photos = await listPhotosByBook(bookId, sessionToken);
  const dims: Record<string, PhotoDims> = {};
  for (const photo of photos) {
    dims[photo.id] = { width: photo.width, height: photo.height };
  }
  const issues = checkCompleteness(book.document, dims);
  const pageCount = book.document.spreads.length * PAGES_PER_SPREAD;
  const initialPrice = priceBook({ format: book.document.format, pageCount });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3">
        <Link
          href={`/editor/${book.id}`}
          className="inline-flex min-h-11 items-center gap-1 self-start rounded-md text-sm font-medium text-ink/70 transition-colors duration-150 hover:text-ink focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:outline-none motion-reduce:transition-none"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          {en.checkout.backToEditor}
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          {en.checkout.title}
        </h1>
      </header>
      <CheckoutForm
        bookId={book.id}
        issues={issues}
        initialPrice={initialPrice}
        format={book.document.format}
        pageCount={pageCount}
      />
    </main>
  );
}
