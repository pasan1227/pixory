import { ChevronDown } from "lucide-react";
import { FadeIn } from "@/components/marketing/FadeIn";
import { en } from "@/i18n/en";
import { faqJsonLd } from "@/lib/seo";

// Native <details>/<summary> accordions — zero client JS — plus a schema.org
// FAQPage JSON-LD block built from the exact same items.
export function FaqSection() {
  const items = [...en.marketing.faq.items];

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <FadeIn>
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {en.marketing.faq.title}
        </h2>
      </FadeIn>
      <FadeIn className="mt-8" delayMs={75}>
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          {items.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  aria-hidden="true"
                  className="size-5 shrink-0 text-ink/70 transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="pb-4 text-ink/70">{item.a}</p>
            </details>
          ))}
        </div>
      </FadeIn>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(items)) }}
      />
    </section>
  );
}
