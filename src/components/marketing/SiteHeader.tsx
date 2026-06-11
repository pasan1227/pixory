import Link from "next/link";
import { en } from "@/i18n/en";

// RSC — plain links, no hamburger, no JS. Below sm the secondary links
// (pricing/occasions/about/contact) hide so 360px keeps brand + my books
// + CTA on one clean row.
const visibleLink =
  "inline-flex min-h-11 items-center px-2 text-sm text-ink/70 transition-colors hover:text-ink sm:px-3";
const wideOnlyLink =
  "hidden min-h-11 items-center px-3 text-sm text-ink/70 transition-colors hover:text-ink sm:inline-flex";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-sand bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-display text-xl font-semibold tracking-tight"
        >
          {en.brand.name}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/#pricing" className={wideOnlyLink}>
            {en.marketing.nav.pricing}
          </Link>
          <Link href="/#occasions" className={wideOnlyLink}>
            {en.marketing.nav.occasions}
          </Link>
          <Link href="/about" className={wideOnlyLink}>
            {en.marketing.nav.about}
          </Link>
          <Link href="/contact" className={wideOnlyLink}>
            {en.marketing.nav.contact}
          </Link>
          <Link href="/my-books" className={visibleLink}>
            {en.marketing.nav.myBooks}
          </Link>
          <Link
            href="/create"
            className="ml-1 inline-flex min-h-11 items-center rounded-full bg-terracotta-deep px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink sm:ml-2 sm:px-6"
          >
            {en.marketing.nav.cta}
          </Link>
        </nav>
      </div>
    </header>
  );
}
