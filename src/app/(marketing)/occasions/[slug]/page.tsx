import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { getOccasion, OCCASIONS, type Occasion } from "@/data/occasions";
import { BRAND_NAME } from "@/data/site";
import { en } from "@/i18n/en";
import { siteUrl } from "@/lib/seo";

// Statically generated SEO landers — one per occasion in src/data/occasions.ts.

type Params = Readonly<{ params: Promise<{ slug: string }> }>;

export function generateStaticParams(): Array<{ slug: string }> {
  return OCCASIONS.map((occasion) => ({ slug: occasion.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const occasion = getOccasion(slug);
  if (!occasion) {
    notFound();
  }
  return {
    // seoTitle is already a complete SERP title — bypass the root
    // "%s — Pixela" template so it isn't double-branded.
    title: { absolute: occasion.seoTitle },
    description: occasion.seoDescription,
    alternates: { canonical: `${siteUrl()}/occasions/${occasion.slug}` },
    // Next replaces openGraph wholesale (no deep merge with the root
    // layout), so re-state the site-wide fields here.
    openGraph: {
      title: occasion.seoTitle,
      description: occasion.seoDescription,
      images: [occasion.image],
      siteName: BRAND_NAME,
      type: "website",
      locale: "en_LK",
    },
  };
}

const CTA_CLASSES =
  "inline-block rounded-full bg-terracotta px-8 py-3 font-medium text-paper transition-colors hover:bg-terracotta-deep";

function Hero({ occasion }: Readonly<{ occasion: Occasion }>) {
  return (
    <section className="bg-paper">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {occasion.heroTitle}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            {occasion.heroBody}
          </p>
          <div className="mt-8">
            <Link href="/create" className={CTA_CLASSES}>
              {en.marketing.occasions.cta}
            </Link>
          </div>
        </div>
        <Image
          src={occasion.image}
          alt={occasion.imageAlt}
          width={640}
          height={480}
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="h-auto w-full rounded-2xl"
        />
      </div>
    </section>
  );
}

function HowItWorksStrip() {
  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {en.marketing.how.title}
        </h2>
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {en.marketing.how.steps.map((step, index) => (
            <li key={step.title}>
              <span className="font-display text-2xl font-semibold text-terracotta">
                {index + 1}
              </span>
              <h3 className="mt-2 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function OtherOccasions({ currentSlug }: Readonly<{ currentSlug: string }>) {
  const others = OCCASIONS.filter((occasion) => occasion.slug !== currentSlug);
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {en.marketing.occasions.title}
        </h2>
        <p className="mt-3 text-ink/70">{en.marketing.occasions.subtitle}</p>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
          {others.map((occasion) => (
            <li key={occasion.slug}>
              <Link
                href={`/occasions/${occasion.slug}`}
                className="font-medium text-terracotta-deep underline-offset-4 transition-colors hover:text-terracotta hover:underline"
              >
                {occasion.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-sand">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {en.brand.tagline}
        </h2>
        <div className="mt-8">
          <Link href="/create" className={CTA_CLASSES}>
            {en.marketing.occasions.cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function OccasionPage({ params }: Params) {
  const { slug } = await params;
  const occasion = getOccasion(slug);
  if (!occasion) {
    notFound();
  }
  const whatsappMessage = en.marketing.whatsapp.occasionPrefill.replace(
    "{occasion}",
    occasion.title,
  );
  return (
    <>
      <Hero occasion={occasion} />
      <HowItWorksStrip />
      <OtherOccasions currentSlug={occasion.slug} />
      <FinalCta />
      <WhatsAppFloat message={whatsappMessage} />
    </>
  );
}
