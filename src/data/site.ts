// Single place to change brand identity and contact details.
// Working name — replace globally when the final brand name is confirmed.
export const BRAND_NAME = "Pixela";

// International format without "+" (wa.me link format). TODO: real number.
export const WHATSAPP_NUMBER = "94770000000";

// The one place WhatsApp deep links are built.
export function waLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
