"use server";

import { redirect } from "next/navigation";
import { resumeBookByShareToken } from "@/server/repositories/books";
import { adoptSessionToken } from "@/server/session";

// Redeems a resume link: rotates the share token (each link works once) and
// adopts the book's anonymous session on this device. POST-only by nature of
// server actions, so link-preview crawlers can never burn a token.
// AUTH SEAM: with real accounts this becomes a magic-login confirmation.
export async function redeemResumeLinkAction(
  shareToken: string,
): Promise<void> {
  const resumed = await resumeBookByShareToken(shareToken);
  if (!resumed) {
    redirect("/my-books");
  }
  await adoptSessionToken(resumed.sessionToken);
  redirect(`/editor/${resumed.bookId}`);
}
