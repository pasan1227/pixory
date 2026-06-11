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

export async function listBooksBySession(
  sessionToken: string,
): Promise<BookRecord[]> {
  const rows = await prisma.book.findMany({
    where: { sessionToken },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toRecord);
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
