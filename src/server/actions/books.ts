"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { bookFormatSchema } from "@/lib/schemas/book";
import { createEmptyBookDocument } from "@/lib/new-book";
import { createBook } from "@/server/repositories/books";
import { ensureSessionToken } from "@/server/session";

const createBookInputSchema = z.object({ format: bookFormatSchema });

// Creates an empty book under the caller's (possibly freshly minted)
// anonymous session and lands them in the editor.
export async function createBookAction(formData: FormData): Promise<void> {
  const parsed = createBookInputSchema.safeParse({
    format: formData.get("format"),
  });
  if (!parsed.success) {
    redirect("/create");
  }
  const sessionToken = await ensureSessionToken();
  const document = createEmptyBookDocument(parsed.data.format);
  const book = await createBook(sessionToken, document);
  redirect(`/editor/${book.id}`);
}
