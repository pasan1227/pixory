"use server";

import { redirect } from "next/navigation";
import { checkCompleteness, type PhotoDims } from "@/lib/completeness";
import { evaluateCheckoutGate } from "@/lib/checkout-gate";
import { checkoutFormSchema, type PlaceOrderResult } from "@/lib/schemas/order";
import { findOwnedBook } from "@/server/repositories/books";
import { createOrder } from "@/server/repositories/orders";
import { listPhotosByBook } from "@/server/repositories/photos";
import { getNotifier } from "@/server/notify";
import { getSessionToken } from "@/server/session";

// Places an order: validates the form (Zod), re-runs the completeness gate
// SERVER-SIDE against the book's current document (client state is never
// trusted), snapshots the document via the repository, notifies, redirects.
export async function placeOrderAction(
  input: unknown,
): Promise<PlaceOrderResult> {
  const sessionToken = await getSessionToken();
  if (!sessionToken) return { ok: false, error: "not_found" };

  const parsed = checkoutFormSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    if (message === "invalid_phone") return { ok: false, error: "invalid_phone" };
    if (message === "cod_outside_colombo") {
      return { ok: false, error: "cod_outside_colombo" };
    }
    return { ok: false, error: "invalid_input" };
  }

  const book = await findOwnedBook(parsed.data.bookId, sessionToken);
  if (!book) return { ok: false, error: "not_found" };

  const photos = await listPhotosByBook(book.id, sessionToken);
  const dims: Record<string, PhotoDims> = {};
  for (const photo of photos) {
    dims[photo.id] = { width: photo.width, height: photo.height };
  }
  const gate = evaluateCheckoutGate(
    checkCompleteness(book.document, dims),
    parsed.data.confirmedBlank,
  );
  if (!gate.ok) return { ok: false, error: "gate_blocked" };

  const order = await createOrder(sessionToken, parsed.data);
  if (!order) return { ok: false, error: "not_found" };

  // Console notifier in v1 — Resend/WhatsApp slot in behind the interface.
  await getNotifier().orderReceived(order);

  redirect(`/order/${order.reference}`);
}
