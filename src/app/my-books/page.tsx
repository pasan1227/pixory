import type { Metadata } from "next";
import Link from "next/link";
import { BookCard, type BookCardProps } from "@/components/my-books/BookCard";
import { en } from "@/i18n/en";
import { toPhotoDto } from "@/server/photo-dto";
import { listBooksBySession } from "@/server/repositories/books";
import { listPhotosByBook } from "@/server/repositories/photos";
import { getSessionToken } from "@/server/session";

export const metadata: Metadata = { title: en.myBooks.metaTitle };

// Books are few per session, so fetching each book's photos here is fine —
// the cards need them to render real cover thumbnails.
async function loadCards(sessionToken: string): Promise<BookCardProps[]> {
  const books = await listBooksBySession(sessionToken);
  return Promise.all(
    books.map(async (book) => ({
      bookId: book.id,
      document: book.document,
      updatedAt: book.updatedAt.toISOString(),
      photoCount: book.photoCount,
      shareToken: book.shareToken,
      photos: (await listPhotosByBook(book.id, sessionToken)).map(toPhotoDto),
    })),
  );
}

function EmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-sand bg-white px-8 py-12 text-center">
      <p className="text-ink/70">{en.myBooks.empty}</p>
      <Link
        href="/create"
        className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
      >
        {en.myBooks.startCta}
      </Link>
    </div>
  );
}

// /my-books — server-rendered list of this anonymous session's books.
export default async function MyBooksPage() {
  const sessionToken = await getSessionToken();
  const cards = sessionToken ? await loadCards(sessionToken) : [];
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {en.myBooks.title}
      </h1>
      {cards.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <BookCard key={card.bookId} {...card} />
          ))}
        </div>
      )}
    </main>
  );
}
