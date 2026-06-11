import Link from "next/link";
import { FadeIn } from "@/components/marketing/FadeIn";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import { FORMAT_PRICING, FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";
import { PRINT_SPECS } from "@/lib/print-specs";
import { BOOK_FORMATS } from "@/lib/schemas/book";
import type { BookFormat } from "@/types/book";

// The mid-size square is the format we nudge people toward.
const HIGHLIGHTED_FORMAT: BookFormat = "square_26";

function PricingCard({ format }: Readonly<{ format: BookFormat }>) {
  const spec = PRINT_SPECS[format];
  const pricing = FORMAT_PRICING[format];
  const highlighted = format === HIGHLIGHTED_FORMAT;

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border border-ink/10 bg-paper p-6 ${
        highlighted ? "ring-2 ring-terracotta" : ""
      }`}
    >
      <h3 className="font-display text-xl font-semibold tracking-tight">
        {en.formats[format]}
      </h3>
      <p className="mt-1 text-sm text-ink/70">
        {en.create.sizeLabel
          .replace("{w}", String(spec.pageWidthMm / 10))
          .replace("{h}", String(spec.pageHeightMm / 10))}
      </p>
      <p className="mt-6 font-display text-3xl font-semibold tracking-tight">
        {en.marketing.pricingSection.from.replace(
          "{price}",
          formatLKR(pricing.basePrice),
        )}
      </p>
      <p className="mt-4 text-sm text-ink/70">
        {en.marketing.pricingSection.pagesIncluded.replace(
          "{count}",
          String(pricing.includedPages),
        )}
      </p>
      <p className="mt-1 text-sm text-ink/70">
        {en.marketing.pricingSection.extraPage.replace(
          "{price}",
          formatLKR(pricing.extraPagePrice),
        )}
      </p>
    </div>
  );
}

export function PricingSection() {
  const subtitle = en.marketing.pricingSection.subtitle.replace(
    "{max}",
    String(PRINT_SPECS[HIGHLIGHTED_FORMAT].maxPages),
  );

  return (
    <section
      id="pricing"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-16 sm:py-24"
    >
      <FadeIn className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {en.marketing.pricingSection.title}
        </h2>
        <p className="mt-3 text-lg text-ink/70">{subtitle}</p>
      </FadeIn>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {BOOK_FORMATS.map((format, index) => (
          <FadeIn key={format} delayMs={index * 75}>
            <PricingCard format={format} />
          </FadeIn>
        ))}
      </div>
      <FadeIn
        className="mt-10 flex flex-col items-center gap-6 text-center"
        delayMs={150}
      >
        <p className="text-sm text-ink/70">
          {en.marketing.pricingSection.freeDeliveryNote.replace(
            "{threshold}",
            formatLKR(FREE_DELIVERY_THRESHOLD),
          )}
        </p>
        <Link
          href="/create"
          className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
        >
          {en.marketing.pricingSection.cta}
        </Link>
      </FadeIn>
    </section>
  );
}
