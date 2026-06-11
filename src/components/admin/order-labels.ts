import { DISTRICTS } from "@/data/districts";
import { en } from "@/i18n/en";
import { paymentPreferenceSchema } from "@/lib/schemas/order";

// Display helpers shared by the admin orders list and detail pages. Order
// rows store district/paymentPref as plain strings; these map them back to
// their user-facing labels (falling back to the raw value rather than
// hiding an order with unexpected data).

export function districtLabel(district: string): string {
  return DISTRICTS.find((d) => d.id === district)?.label ?? district;
}

export function paymentLabel(paymentPref: string): string {
  const parsed = paymentPreferenceSchema.safeParse(paymentPref);
  return parsed.success ? en.admin.payment[parsed.data] : paymentPref;
}

// Colombo-local timestamps for order rows.
export const placedAtFormatter = new Intl.DateTimeFormat("en-LK", {
  timeZone: "Asia/Colombo",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
