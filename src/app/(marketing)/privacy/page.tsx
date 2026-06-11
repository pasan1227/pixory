import type { Metadata } from "next";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { en } from "@/i18n/en";

const t = en.marketing.privacy;

export const metadata: Metadata = { title: t.metaTitle };

export default function PrivacyPage() {
  return (
    <>
      <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.title}
        </h1>
        <div className="mt-8 space-y-6 leading-relaxed text-ink/80">
          <p>{t.body1}</p>
          <p>{t.body2}</p>
          <p>{t.body3}</p>
          <p>{t.body4}</p>
        </div>
      </article>
      <WhatsAppFloat message={en.marketing.whatsapp.defaultPrefill} />
    </>
  );
}
