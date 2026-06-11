import { notFound } from "next/navigation";
import { EditorShell } from "@/components/editor/EditorShell";
import { priceBook } from "@/lib/pricing";
import { PAGES_PER_SPREAD } from "@/lib/print-specs";
import { toPhotoDto } from "@/server/photo-dto";
import { findOwnedBook } from "@/server/repositories/books";
import { listPhotosByBook } from "@/server/repositories/photos";
import { getSessionToken } from "@/server/session";

// RSC entry for the editor: ownership check, photo list, and the initial
// server-computed price (the client never recomputes — it re-quotes via
// quotePriceAction when the page count changes).
export default async function EditorPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const sessionToken = await getSessionToken();
  if (!sessionToken) notFound();

  const book = await findOwnedBook(bookId, sessionToken);
  if (!book) notFound();

  const records = await listPhotosByBook(bookId, sessionToken);
  const initialPrice = priceBook({
    format: book.document.format,
    pageCount: book.document.spreads.length * PAGES_PER_SPREAD,
  });

  return (
    <EditorShell
      bookId={book.id}
      document={book.document}
      updatedAt={book.updatedAt.toISOString()}
      initialPhotos={records.map(toPhotoDto)}
      initialPrice={initialPrice}
    />
  );
}
