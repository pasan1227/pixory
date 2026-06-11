import { CircleCheck, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WHATSAPP_NUMBER } from "@/data/site";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import {
  paymentPreferenceSchema,
  type PaymentPreference,
} from "@/lib/schemas/order";
import {
  findOwnedOrderByReference,
  type OrderRecord,
} from "@/server/repositories/orders";
import { getSessionToken } from "@/server/session";

export const metadata: Metadata = { title: en.order.metaTitle };

const PAYMENT_NOTES: Record<PaymentPreference, string> = {
  cod: en.order.paymentCod,
  bank_transfer: en.order.paymentBank,
  card_payhere: en.order.paymentCard,
};

// The repository stores paymentPref as a plain string; orders are only ever
// created through checkoutFormSchema, so parsing back to the enum is safe.
function paymentNote(pref: string): string {
  return PAYMENT_NOTES[paymentPreferenceSchema.parse(pref)];
}

function whatsappHref(reference: string): string {
  const text = en.order.whatsappPrefill.replace("{reference}", reference);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function OrderSummaryLine({ order }: Readonly<{ order: OrderRecord }>) {
  const book = en.checkout.summary.book
    .replace("{format}", en.formats[order.format])
    .replace("{pages}", String(order.pageCount));
  return (
    <p className="text-sm text-ink/70">
      {book} · {formatLKR(order.total)}
    </p>
  );
}

// /order/[reference] — warm confirmation shown only to the session that
// placed the order. Renders from the Order row (already a frozen snapshot).
export default async function OrderConfirmationPage({
  params,
}: Readonly<{ params: Promise<{ reference: string }> }>) {
  const { reference } = await params;
  const sessionToken = await getSessionToken();
  const order = sessionToken
    ? await findOwnedOrderByReference(reference, sessionToken)
    : null;
  if (!order) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-6 py-12 text-center sm:py-16">
      <CircleCheck className="size-14 text-sage" aria-hidden="true" />
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {en.order.title}
      </h1>
      <div className="w-full rounded-2xl bg-sand px-6 py-5">
        <p className="text-sm text-ink/70">{en.order.referenceLabel}</p>
        <p className="mt-1 font-display text-3xl font-semibold tracking-wide">
          {order.reference}
        </p>
      </div>
      <p className="text-ink/70">{en.order.subtitle}</p>
      <div className="w-full rounded-2xl border border-sand bg-white px-6 py-4">
        <p className="text-sm text-ink">{paymentNote(order.paymentPref)}</p>
        <OrderSummaryLine order={order} />
      </div>
      <a
        href={whatsappHref(order.reference)}
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sage-deep px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-sage focus-visible:ring-2 focus-visible:ring-sage-deep focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
      >
        <MessageCircle className="size-5" aria-hidden="true" />
        {en.order.whatsapp}
      </a>
      <Link
        href="/my-books"
        className="inline-flex min-h-11 items-center px-4 text-sm font-medium text-terracotta underline-offset-4 transition-colors duration-150 hover:text-terracotta-deep hover:underline focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:outline-none motion-reduce:transition-none"
      >
        {en.order.backHome}
      </Link>
    </main>
  );
}
