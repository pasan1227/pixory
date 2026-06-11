import { HandCoins, Printer, Truck } from "lucide-react";
import { en } from "@/i18n/en";

const TRUST_ITEMS = [
  { icon: Printer, label: en.marketing.trust.printed },
  { icon: HandCoins, label: en.marketing.trust.cod },
  { icon: Truck, label: en.marketing.trust.delivery },
] as const;

// Slim reassurance strip directly under the hero.
export function TrustBar() {
  return (
    <div className="bg-sand py-3">
      <ul className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-1 px-6 text-sm">
        {TRUST_ITEMS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2">
            <Icon className="size-4 text-terracotta" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
