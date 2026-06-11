import { migrateBookDocument } from "@/lib/book-migrations";
import { orderReference } from "@/lib/order-reference";
import { priceBook } from "@/lib/pricing";
import { PAGES_PER_SPREAD } from "@/lib/print-specs";
import { bookDocumentSchema } from "@/lib/schemas/book";
import type { CheckoutForm, OrderStatus } from "@/lib/schemas/order";
import { orderStatusSchema } from "@/lib/schemas/order";
import { prisma } from "@/server/db";
import type { BookDocument, BookFormat } from "@/types/book";

// Orders SNAPSHOT the book document at submission and render exclusively
// from that snapshot forever after — editing the book later must never
// affect a placed order. Do not "optimize" the copy into a reference.

export interface OrderRecord {
  id: string;
  reference: string;
  bookId: string;
  customerName: string;
  phone: string;
  email: string | null;
  district: string;
  address: string;
  paymentPref: string;
  status: OrderStatus;
  format: BookFormat;
  pageCount: number;
  subtotal: number;
  delivery: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderRow {
  id: string;
  reference: string;
  bookId: string;
  customerName: string;
  phone: string;
  email: string | null;
  district: string;
  address: string;
  paymentPref: string;
  status: string;
  format: string;
  pageCount: number;
  subtotal: number;
  delivery: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: OrderRow): OrderRecord {
  return {
    ...row,
    status: orderStatusSchema.parse(row.status),
    format: row.format as BookFormat,
  };
}

// Creates the order from the OWNED book's current document. Pricing is
// recomputed server-side here (never trusted from the client); the snapshot
// is serialized through the schema so a malformed document can never be
// frozen into an order.
export async function createOrder(
  sessionToken: string,
  form: CheckoutForm,
): Promise<OrderRecord | null> {
  const book = await prisma.book.findFirst({
    where: { id: form.bookId, sessionToken },
  });
  if (!book) return null;
  const document = migrateBookDocument(JSON.parse(book.document));
  const pageCount = document.spreads.length * PAGES_PER_SPREAD;
  const price = priceBook({
    format: document.format,
    pageCount,
    district: form.district,
  });
  const snapshot = JSON.stringify(bookDocumentSchema.parse(document));

  // Same-millisecond reference collisions are nudged forward.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = orderReference(Date.now() + attempt);
    try {
      const row = await prisma.order.create({
        data: {
          reference,
          bookId: book.id,
          documentSnapshot: snapshot,
          customerName: form.customerName,
          phone: form.phone,
          email: form.email ?? null,
          district: form.district,
          address: form.address,
          paymentPref: form.paymentPref,
          format: document.format,
          pageCount,
          subtotal: price.subtotal,
          // SAFETY: priceBook always returns a number when district is given.
          delivery: price.delivery ?? 0,
          total: price.total,
        },
      });
      return toRecord(row);
    } catch (error) {
      const unique =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002";
      if (!unique) throw error;
    }
  }
  throw new Error("Could not allocate a unique order reference");
}

// Customer-facing lookup: the success page shows an order only to the
// session that placed it.
export async function findOwnedOrderByReference(
  reference: string,
  sessionToken: string,
): Promise<OrderRecord | null> {
  const row = await prisma.order.findFirst({
    where: { reference, book: { sessionToken } },
  });
  return row ? toRecord(row) : null;
}

// ---- Admin scope (no session: callers must requireAdmin()) ----

export async function adminListOrders(): Promise<OrderRecord[]> {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toRecord);
}

export interface AdminOrderDetail extends OrderRecord {
  snapshot: BookDocument;
}

export async function adminFindOrder(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const row = await prisma.order.findUnique({ where: { id: orderId } });
  if (!row) return null;
  return {
    ...toRecord(row),
    snapshot: migrateBookDocument(JSON.parse(row.documentSnapshot)),
  };
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<OrderRecord | null> {
  const result = await prisma.order.updateMany({
    where: { id: orderId },
    data: { status },
  });
  if (result.count === 0) return null;
  const row = await prisma.order.findUnique({ where: { id: orderId } });
  return row ? toRecord(row) : null;
}
