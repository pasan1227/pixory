import type { Metadata } from "next";
import { WhatsAppFloat } from "@/components/marketing/WhatsAppFloat";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import {
  DELIVERY_FEE_COLOMBO,
  DELIVERY_FEE_ISLANDWIDE,
  FREE_DELIVERY_THRESHOLD,
} from "@/lib/pricing";

const t = en.marketing.deliveryPage;

export const metadata: Metadata = { title: t.metaTitle };

function zoneLine(template: string, fee: number): string {
  return template
    .replace("{price}", formatLKR(fee))
    .replace("{threshold}", formatLKR(FREE_DELIVERY_THRESHOLD));
}

export default function DeliveryAndPaymentsPage() {
  return (
    <>
      <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.title}
        </h1>

        <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">
          {t.deliveryTitle}
        </h2>
        <p className="mt-4 leading-relaxed text-ink/80">{t.deliveryBody}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink/80">
          <li>{zoneLine(t.zoneColombo, DELIVERY_FEE_COLOMBO)}</li>
          <li>{zoneLine(t.zoneIsland, DELIVERY_FEE_ISLANDWIDE)}</li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">
          {t.paymentsTitle}
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-ink/80">
          <li>{t.payCod}</li>
          <li>{t.payBank}</li>
          <li>{t.payCard}</li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">
          {t.proofTitle}
        </h2>
        <p className="mt-4 leading-relaxed text-ink/80">{t.proofBody}</p>
      </article>
      <WhatsAppFloat message={en.marketing.whatsapp.defaultPrefill} />
    </>
  );
}
