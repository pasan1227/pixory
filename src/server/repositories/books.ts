import { randomUUID } from "node:crypto";
import { migrateBookDocument } from "@/lib/book-migrations";
import { bookDocumentSchema } from "@/lib/schemas/book";
import { prisma } from "@/server/db";
import type { BookDocument } from "@/types/book";

// All Book persistence goes through here. Ownership (sessionToken vs. book)
// is enforced in this layer — every read/write requires the caller's session
// token in the WHERE clause, so a wrong token behaves exactly like a missing
// row. Documents are Zod-validated on the way in and migrated+validated on
// the way out; raw JSON never leaks past this module.

export interface BookRecord {
  id: string;
  shareToken: string;
  document: BookDocument;
  createdAt: Date;
  updatedAt: Date;
}

interface BookRow {
  id: string;
  shareToken: string;
  document: string;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: BookRow): BookRecord {
  return {
    id: row.id,
    shareToken: row.shareToken,
    document: migrateBookDocument(JSON.parse(row.document)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function serializeDocument(document: BookDocument): string {
  return JSON.stringify(bookDocumentSchema.parse(document));
}

export async function createBook(
  sessionToken: string,
  document: BookDocument,
): Promise<BookRecord> {
  const row = await prisma.book.create({
    data: {
      sessionToken,
      shareToken: randomUUID(),
      document: serializeDocument(document),
    },
  });
  return toRecord(row);
}

export async function findOwnedBook(
  bookId: string,
  sessionToken: string,
): Promise<BookRecord | null> {
  const row = await prisma.book.findFirst({
    where: { id: bookId, sessionToken },
  });
  return row ? toRecord(row) : null;
}

export interface BookListItem extends BookRecord {
  photoCount: number;
}

export async function listBooksBySession(
  sessionToken: string,
): Promise<BookListItem[]> {
  const rows = await prisma.book.findMany({
    where: { sessionToken },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { photos: true } } },
  });
  return rows.map((row) => ({
    ...toRecord(row),
    photoCount: row._count.photos,
  }));
}

// Side-effect-free lookup for the resume confirmation page (GETs must not
// redeem: WhatsApp link previews and browser prefetches hit the URL before
// the user does).
export async function peekBookByShareToken(
  shareToken: string,
): Promise<{ title: string } | null> {
  const row = await prisma.book.findUnique({
    where: { shareToken },
    select: { document: true },
  });
  if (!row) return null;
  return { title: migrateBookDocument(JSON.parse(row.document)).cover.title };
}

// Resume-link redemption: looks the book up by its share token and rotates
// the token in the same guarded update, so a link works exactly once. Returns
// the book's session token — the resuming device ADOPTS that session (same
// person on another device; with real accounts this becomes a login).
export async function resumeBookByShareToken(
  shareToken: string,
): Promise<{ bookId: string; sessionToken: string } | null> {
  const row = await prisma.book.findUnique({ where: { shareToken } });
  if (!row) return null;
  // Guarded on the OLD token: two concurrent redemptions can't both win.
  const rotated = await prisma.book.updateMany({
    where: { id: row.id, shareToken },
    data: { shareToken: randomUUID() },
  });
  if (rotated.count === 0) return null;
  return { bookId: row.id, sessionToken: row.sessionToken };
}

// Delete a book with its photos (FK cascade). Refuses when orders reference
// the book — placed orders must keep their snapshot source row intact.
export async function deleteBook(
  bookId: string,
  sessionToken: string,
): Promise<{ photoKeys: string[] } | null> {
  const book = await prisma.book.findFirst({
    where: { id: bookId, sessionToken },
    include: {
      photos: { select: { previewKey: true, originalKey: true } },
      _count: { select: { orders: true } },
    },
  });
  if (!book || book._count.orders > 0) return null;
  await prisma.book.delete({ where: { id: book.id } });
  const photoKeys = book.photos.flatMap((photo) =>
    photo.originalKey
      ? [photo.previewKey, photo.originalKey]
      : [photo.previewKey],
  );
  return { photoKeys };
}

// Autosave write: last-write-wins guarded by updatedAt. The update only
// applies when the row still carries the updatedAt the client loaded;
// otherwise a newer write (another tab/device) wins and we report "conflict".
export async function updateBookDocument(
  bookId: string,
  sessionToken: string,
  document: BookDocument,
  expectedUpdatedAt: Date,
): Promise<BookRecord | "conflict" | null> {
  const result = await prisma.book.updateMany({
    where: { id: bookId, sessionToken, updatedAt: expectedUpdatedAt },
    data: { document: serializeDocument(document) },
  });
  if (result.count === 1) {
    const row = await prisma.book.findFirst({
      where: { id: bookId, sessionToken },
    });
    return row ? toRecord(row) : null;
  }
  const owned = await prisma.book.count({
    where: { id: bookId, sessionToken },
  });
  return owned > 0 ? "conflict" : null;
}

// True if the session owns the book — for callers that need a cheap guard
// without materializing the document.
export async function isBookOwned(
  bookId: string,
  sessionToken: string,
): Promise<boolean> {
  const count = await prisma.book.count({
    where: { id: bookId, sessionToken },
  });
  return count > 0;
}
