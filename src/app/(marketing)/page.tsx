import type { Metadata } from "next";
import Link from "next/link";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { FaqSection } from "@/components/marketing/home/FaqSection";
import { Hero } from "@/components/marketing/home/Hero";
import { HowItWorks } from "@/components/marketing/home/HowItWorks";
import { OccasionsGrid } from "@/components/marketing/home/OccasionsGrid";
import { PricingSection } from "@/components/marketing/home/PricingSection";
import { Testimonials } from "@/components/marketing/home/Testimonials";
import { TrustBar } from "@/components/marketing/home/TrustBar";
import { images } from "@/data/images";
import { BRAND_NAME } from "@/data/site";
import { en } from "@/i18n/en";
import { organizationJsonLd, siteUrl } from "@/lib/seo";

// The root layout owns the title; the home page only refines the description.
export const metadata: Metadata = {
  description: en.meta.defaultDescription,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <OccasionsGrid />
      <HowItWorks />
      <PricingSection />
      <Testimonials />
      <FaqSection />
      <section className="bg-terracotta-deep text-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-16 text-center sm:py-20">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {en.brand.tagline}
          </h2>
          <Link
            href="/create"
            className="inline-flex min-h-11 items-center rounded-full bg-paper px-8 py-3 font-medium text-ink transition-colors duration-150 hover:bg-sand focus-visible:ring-2 focus-visible:ring-paper focus-visible:ring-offset-2 focus-visible:ring-offset-terracotta focus-visible:outline-none motion-reduce:transition-none"
          >
            {en.marketing.pricingSection.cta}
          </Link>
        </div>
      </section>
      <WhatsAppFloat message={en.marketing.whatsapp.defaultPrefill} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            organizationJsonLd({
              name: BRAND_NAME,
              url: siteUrl(),
              logo: images.og,
            }),
          ),
        }}
      />
    </>
  );
}
