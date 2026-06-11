import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/marketing/FadeIn";
import { OCCASIONS } from "@/data/occasions";
import { en } from "@/i18n/en";

// Occasion cards linking to the SEO landers under /occasions/[slug].
export function OccasionsGrid() {
  return (
    <section
      id="occasions"
      className="mx-auto w-full max-w-6xl scroll-mt-24 px-6 py-16 sm:py-24"
    >
      <FadeIn className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {en.marketing.occasions.title}
        </h2>
        <p className="mt-3 text-lg text-ink/70">
          {en.marketing.occasions.subtitle}
        </p>
      </FadeIn>
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {OCCASIONS.map((occasion, index) => (
          <FadeIn key={occasion.slug} delayMs={(index % 3) * 75}>
            <Link href={`/occasions/${occasion.slug}`} className="group block">
              <div className="overflow-hidden rounded-2xl">
                <Image
                  src={occasion.image}
                  alt={occasion.imageAlt}
                  width={640}
                  height={480}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-150 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">
                {occasion.title}
              </h3>
              <p className="mt-1 text-ink/70">{occasion.blurb}</p>
            </Link>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
