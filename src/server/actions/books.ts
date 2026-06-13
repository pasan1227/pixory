"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { COVER_LAYOUTS } from "@/data/layouts";
import { DISTRICT_IDS } from "@/data/districts";
import { priceBook, type PriceBreakdown } from "@/lib/pricing";
import {
  bookDocumentSchema,
  bookFontIdSchema,
  bookFormatSchema,
  coverColorIdSchema,
} from "@/lib/schemas/book";
import { createEmptyBookDocument } from "@/lib/new-book";
import { switchCoverLayout, updateCoverStyle } from "@/lib/cover-ops";
import type { CoverStylePatch } from "@/lib/cover-ops";
import type { BookDocument, CoverTextStyle } from "@/types/book";
import {
  createBook,
  deleteBook,
  updateBookDocument,
} from "@/server/repositories/books";
import { getStorage } from "@/server/storage";
import { ensureSessionToken, getSessionToken } from "@/server/session";

const coverLayoutIdSchema = z
  .string()
  .refine((id) => COVER_LAYOUTS.some((layout) => layout.id === id));

// Compact whole-field emphasis flags, e.g. "bu" = bold+underline.
const styleFlagSchema = z.string().regex(/^[biu]*$/).optional();

const createBookInputSchema = z.object({
  format: bookFormatSchema,
  coverLayout: coverLayoutIdSchema.optional(),
  coverColor: coverColorIdSchema.optional(),
  coverFont: bookFontIdSchema.optional(),
  coverTitle: z.string().trim().max(120).optional(),
  coverSubtitle: z.string().trim().max(160).optional(),
  titleStyleFlag: styleFlagSchema,
  subtitleStyleFlag: styleFlagSchema,
});

type CreateBookInput = z.infer<typeof createBookInputSchema>;

// Decode a flag string into a style, or undefined when nothing is set.
function parseStyleFlag(flag: string | undefined): CoverTextStyle | undefined {
  if (!flag) return undefined;
  const style = {
    bold: flag.includes("b"),
    italic: flag.includes("i"),
    underline: flag.includes("u"),
  };
  return style.bold || style.italic || style.underline ? style : undefined;
}

// Builds the starting document from the create-flow choices using only pure
// document ops. updateCoverStyle is a no-op when the patch is empty, so an
// untouched field never forces a write.
function buildCreatedDocument(input: CreateBookInput): BookDocument {
  let document = createEmptyBookDocument(input.format);
  if (input.coverLayout) {
    document = switchCoverLayout(document, input.coverLayout);
  }
  const patch: CoverStylePatch = {};
  if (input.coverColor) patch.colorId = input.coverColor;
  if (input.coverFont) patch.fontId = input.coverFont;
  if (input.coverTitle) patch.title = input.coverTitle;
  if (input.coverSubtitle) patch.subtitle = input.coverSubtitle;
  const titleStyle = parseStyleFlag(input.titleStyleFlag);
  if (titleStyle) patch.titleStyle = titleStyle;
  const subtitleStyle = parseStyleFlag(input.subtitleStyleFlag);
  if (subtitleStyle) patch.subtitleStyle = subtitleStyle;
  return updateCoverStyle(document, patch);
}

// Creates an empty book under the caller's (possibly freshly minted)
// anonymous session and lands them in the editor.
export async function createBookAction(formData: FormData): Promise<void> {
  const parsed = createBookInputSchema.safeParse({
    format: formData.get("format"),
    coverLayout: formData.get("coverLayout") ?? undefined,
    coverColor: formData.get("coverColor") ?? undefined,
    coverFont: formData.get("coverFont") ?? undefined,
    coverTitle: formData.get("coverTitle") ?? undefined,
    coverSubtitle: formData.get("coverSubtitle") ?? undefined,
    titleStyleFlag: formData.get("titleStyleFlag") ?? undefined,
    subtitleStyleFlag: formData.get("subtitleStyleFlag") ?? undefined,
  });
  if (!parsed.success) {
    redirect("/create");
  }
  const sessionToken = await ensureSessionToken();
  const book = await createBook(sessionToken, buildCreatedDocument(parsed.data));
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
