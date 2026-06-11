import type { Metadata } from "next";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { waLink } from "@/data/site";
import { en } from "@/i18n/en";

const t = en.marketing.contact;

export const metadata: Metadata = { title: t.metaTitle };

const waHref = waLink(en.marketing.whatsapp.defaultPrefill);

function ContactCard({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-2xl bg-sand p-6">
      <h2 className="font-display text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

export default function ContactPage() {
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-6 leading-relaxed text-ink/80">{t.body}</p>
        <div className="mt-10 grid gap-4">
          <ContactCard title={t.whatsappTitle}>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              {t.whatsappBody}
            </p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-terracotta px-6 py-2 text-sm font-medium text-paper transition-colors hover:bg-terracotta-deep"
            >
              {en.marketing.whatsapp.label}
            </a>
          </ContactCard>
          <ContactCard title={t.emailTitle}>
            <a
              href={`mailto:${t.email}`}
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-terracotta-deep underline underline-offset-4"
            >
              {t.email}
            </a>
          </ContactCard>
          <ContactCard title={t.hoursTitle}>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              {t.hours}
            </p>
          </ContactCard>
        </div>
      </div>
      <WhatsAppFloat message={en.marketing.whatsapp.defaultPrefill} />
    </>
  );
}
