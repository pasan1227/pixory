"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DISTRICT_IDS } from "@/data/districts";
import { priceBook, type PriceBreakdown } from "@/lib/pricing";
import { bookDocumentSchema, bookFormatSchema } from "@/lib/schemas/book";
import { createEmptyBookDocument } from "@/lib/new-book";
import { updateCoverStyle } from "@/lib/cover-ops";
import { switchCoverLayout } from "@/lib/cover-ops";
import {
  createBook,
  deleteBook,
  updateBookDocument,
} from "@/server/repositories/books";
import { getStorage } from "@/server/storage";
import { ensureSessionToken, getSessionToken } from "@/server/session";
import {
  coverColorIdSchema,
} from "@/lib/schemas/book";
import { COVER_LAYOUTS } from "@/data/layouts";

const coverLayoutIdSchema = z
  .string()
  .refine((id) => COVER_LAYOUTS.some((layout) => layout.id === id));

const createBookInputSchema = z.object({
  format: bookFormatSchema,
  coverLayout: coverLayoutIdSchema.optional(),
  coverColor: coverColorIdSchema.optional(),
});

// Creates an empty book under the caller's (possibly freshly minted)
// anonymous session and lands them in the editor.
export async function createBookAction(formData: FormData): Promise<void> {
  const parsed = createBookInputSchema.safeParse({
    format: formData.get("format"),
    coverLayout: formData.get("coverLayout") ?? undefined,
    coverColor: formData.get("coverColor") ?? undefined,
  });
  if (!parsed.success) {
    redirect("/create");
  }
  const sessionToken = await ensureSessionToken();
  let document = createEmptyBookDocument(parsed.data.format);
  if (parsed.data.coverLayout) {
    document = switchCoverLayout(document, parsed.data.coverLayout);
  }
  if (parsed.data.coverColor) {
    document = updateCoverStyle(document, { colorId: parsed.data.coverColor });
  }
  const book = await createBook(sessionToken, document);
  redirect(`/editor/${book.id}`);
}

// My-books delete: removes the book row (photos cascade) and cleans up
// stored files. Refused for books that have orders.
export async function deleteBookAction(input: {
  bookId: string;
}): Promise<{ ok: boolean }> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false };
  const parsed = z.object({ bookId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false };
  const result = await deleteBook(parsed.data.bookId, sessionToken);
  if (!result) return { ok: false };
  const storage = getStorage();
  await Promise.allSettled(result.photoKeys.map((key) => storage.delete(key)));
  return { ok: true };
}

const saveBookInputSchema = z.object({
  bookId: z.string().min(1),
  document: bookDocumentSchema,
  baseUpdatedAt: z.iso.datetime({ offset: true }),
});

export type SaveBookResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: "conflict" | "not_found" | "invalid_input" };

// Autosave endpoint — debounced client-side; last-write-wins with the
// updatedAt guard implemented in the repository.
export async function saveBookDocumentAction(
  input: unknown,
): Promise<SaveBookResult> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "not_found" };
  const parsed = saveBookInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const result = await updateBookDocument(
    parsed.data.bookId,
    sessionToken,
    parsed.data.document,
    new Date(parsed.data.baseUpdatedAt),
  );
  if (result === "conflict") return { ok: false, error: "conflict" };
  if (result === null) return { ok: false, error: "not_found" };
  return { ok: true, updatedAt: result.updatedAt.toISOString() };
}

const quotePriceInputSchema = z.object({
  format: bookFormatSchema,
  pageCount: z.number().int(),
  district: z.enum(DISTRICT_IDS).optional(),
});

export type QuotePriceResult =
  | { ok: true; value: PriceBreakdown }
  | { ok: false; error: "invalid_input" };

// The client NEVER recomputes prices — the editor header asks the server,
// which delegates to the single priceBook() function.
export async function quotePriceAction(
  input: unknown,
): Promise<QuotePriceResult> {
  const parsed = quotePriceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  try {
    return { ok: true, value: priceBook(parsed.data) };
  } catch {
    return { ok: false, error: "invalid_input" };
  }
}
