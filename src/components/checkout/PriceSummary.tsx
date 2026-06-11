import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import type { PriceBreakdown } from "@/lib/pricing";
import type { BookFormat } from "@/types/book";

// Displays server-quoted values only — the client never recomputes prices.
// delivery === null means no district has been picked yet.

function deliveryValue(price: PriceBreakdown): string {
  if (price.delivery === null) return en.pricing.deliveryAtCheckout;
  if (price.delivery === 0) return en.checkout.summary.deliveryFree;
  return formatLKR(price.delivery);
}

function Row({
  label,
  value,
  muted = false,
}: Readonly<{ label: string; value: string; muted?: boolean }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-ink/70">{label}</dt>
      <dd className={muted ? "text-ink/60" : "font-medium text-ink"}>
        {value}
      </dd>
    </div>
  );
}

export function PriceSummary({
  format,
  pageCount,
  price,
}: Readonly<{
  format: BookFormat;
  pageCount: number;
  price: PriceBreakdown;
}>) {
  return (
    <section className="rounded-2xl border border-sand bg-white p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold text-ink">
        {en.checkout.summary.title}
      </h2>
      <p className="mt-0.5 text-sm text-ink/60">
        {en.checkout.summary.book
          .replace("{format}", en.formats[format])
          .replace("{pages}", String(pageCount))}
      </p>
      <dl className="mt-4 flex flex-col gap-2">
        <Row
          label={en.checkout.summary.base}
          value={formatLKR(price.basePrice)}
        />
        {price.extraPageCount > 0 && (
          <Row
            label={en.checkout.summary.extraPages.replace(
              "{count}",
              String(price.extraPageCount),
            )}
            value={formatLKR(price.extraPagesCost)}
          />
        )}
        <Row
          label={en.checkout.summary.subtotal}
          value={formatLKR(price.subtotal)}
        />
        <Row
          label={en.checkout.summary.delivery}
          value={deliveryValue(price)}
          muted={price.delivery === null}
        />
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-sand pt-3">
          <dt className="font-semibold text-ink">{en.checkout.summary.total}</dt>
          <dd className="font-display text-xl font-semibold text-ink">
            {formatLKR(price.total)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
