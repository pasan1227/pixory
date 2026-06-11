import { prisma } from "@/server/db";

// Photo persistence. Ownership is enforced through the book relation —
// every query filters on book.sessionToken, so foreign photos are
// indistinguishable from missing ones.

export interface PhotoRecord {
  id: string;
  bookId: string;
  previewKey: string;
  originalKey: string | null;
  originalUploaded: boolean;
  width: number;
  height: number;
  fileName: string;
  capturedAt: Date | null;
  createdAt: Date;
}

export async function createPhoto(input: {
  id: string;
  bookId: string;
  sessionToken: string;
  previewKey: string;
  width: number;
  height: number;
  fileName: string;
  capturedAt: Date | null;
}): Promise<PhotoRecord | null> {
  const owned = await prisma.book.count({
    where: { id: input.bookId, sessionToken: input.sessionToken },
  });
  if (owned === 0) return null;
  return prisma.photo.create({
    data: {
      id: input.id,
      bookId: input.bookId,
      previewKey: input.previewKey,
      width: input.width,
      height: input.height,
      fileName: input.fileName,
      capturedAt: input.capturedAt,
    },
  });
}

export async function markOriginalUploaded(
  photoId: string,
  sessionToken: string,
  originalKey: string,
): Promise<PhotoRecord | null> {
  const result = await prisma.photo.updateMany({
    where: { id: photoId, book: { sessionToken } },
    data: { originalKey, originalUploaded: true },
  });
  if (result.count === 0) return null;
  return prisma.photo.findUnique({ where: { id: photoId } });
}

export async function listPhotosByBook(
  bookId: string,
  sessionToken: string,
): Promise<PhotoRecord[]> {
  return prisma.photo.findMany({
    where: { bookId, book: { sessionToken } },
    // Tray order: capture date ascending, undated last, then upload order.
    orderBy: [{ capturedAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
}

export async function findOwnedPhoto(
  photoId: string,
  sessionToken: string,
): Promise<PhotoRecord | null> {
  return prisma.photo.findFirst({
    where: { id: photoId, book: { sessionToken } },
  });
}

// ---- Admin scope (no session check: callers must requireAdmin()) ----
// Admin order previews and the zip export need a book's photos regardless of
// which anonymous session owns it.
export async function adminListPhotosByBook(
  bookId: string,
): Promise<PhotoRecord[]> {
  return prisma.photo.findMany({
    where: { bookId },
    orderBy: [{ capturedAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
}

// Deletes and returns the record so the caller can clean up storage keys.
export async function deletePhoto(
  photoId: string,
  sessionToken: string,
): Promise<PhotoRecord | null> {
  const photo = await findOwnedPhoto(photoId, sessionToken);
  if (!photo) return null;
  // Refused once the book has orders: the order snapshot references these
  // photo ids and the admin preview/zip need the binaries intact (CLAUDE.md
  // invariant 2 — editing a book after ordering never affects the order).
  const orders = await prisma.order.count({ where: { bookId: photo.bookId } });
  if (orders > 0) return null;
  await prisma.photo.delete({ where: { id: photo.id } });
  return photo;
}
