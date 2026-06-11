import Link from "next/link";
import { BRAND_NAME } from "@/data/site";
import { en } from "@/i18n/en";

// RSC — static footer. The year is computed server-side at render.
interface FooterLink {
  label: string;
  href: string;
}

const exploreLinks: readonly FooterLink[] = [
  { label: en.marketing.nav.home, href: "/" },
  { label: en.marketing.nav.pricing, href: "/#pricing" },
  { label: en.marketing.nav.occasions, href: "/#occasions" },
  { label: en.marketing.nav.cta, href: "/create" },
  { label: en.marketing.nav.myBooks, href: "/my-books" },
];

const supportLinks: readonly FooterLink[] = [
  { label: en.marketing.nav.contact, href: "/contact" },
  {
    label: en.marketing.footer.deliveryAndPayments,
    href: "/delivery-and-payments",
  },
];

const legalLinks: readonly FooterLink[] = [
  { label: en.marketing.footer.privacy, href: "/privacy" },
  { label: en.marketing.footer.terms, href: "/terms" },
];

function FooterColumn({
  heading,
  links,
}: Readonly<{ heading: string; links: readonly FooterLink[] }>) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink">{heading}</h2>
      <ul className="mt-3 space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm text-ink/70 transition-colors hover:text-ink sm:min-h-8"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-sand">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1fr_auto]">
          <div className="max-w-sm">
            <Link
              href="/"
              className="font-display text-xl font-semibold tracking-tight"
            >
              {BRAND_NAME}
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              {en.marketing.footer.blurb}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-12">
            <FooterColumn
              heading={en.marketing.footer.explore}
              links={exploreLinks}
            />
            <FooterColumn
              heading={en.marketing.footer.support}
              links={supportLinks}
            />
            <FooterColumn
              heading={en.marketing.footer.legal}
              links={legalLinks}
            />
          </div>
        </div>
        <p className="mt-12 border-t border-ink/10 pt-6 text-xs text-ink/70">
          © {year} {BRAND_NAME}. {en.marketing.footer.rights}
        </p>
      </div>
    </footer>
  );
}
