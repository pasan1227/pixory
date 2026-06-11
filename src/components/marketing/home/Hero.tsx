import Image from "next/image";
import Link from "next/link";
import { images } from "@/data/images";
import { en } from "@/i18n/en";

// Above-the-fold hero. Intentionally NOT wrapped in FadeIn: the hero image is
// the LCP element and must paint immediately, never behind a fade.
export function Hero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 pt-12 pb-16 sm:pt-16 lg:grid-cols-2 lg:gap-16 lg:pb-24">
      <div className="flex flex-col items-start gap-6">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          {en.marketing.hero.title}
        </h1>
        <p className="max-w-xl text-lg text-ink/70">
          {en.marketing.hero.subtitle}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/create"
            className="inline-flex min-h-11 items-center rounded-full bg-terracotta-deep px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-ink focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
          >
            {en.marketing.hero.ctaPrimary}
          </Link>
          <Link
            href="#pricing"
            className="inline-flex min-h-11 items-center rounded-full border border-ink/20 px-8 py-3 font-medium transition-colors duration-150 hover:border-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
          >
            {en.marketing.hero.ctaSecondary}
          </Link>
        </div>
      </div>
      <Image
        src={images.hero}
        alt={en.marketing.hero.imageAlt}
        width={1040}
        height={780}
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="w-full rounded-2xl shadow-lg"
      />
    </section>
  );
}
