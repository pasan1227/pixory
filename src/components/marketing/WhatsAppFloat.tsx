import { MessageCircle } from "lucide-react";
import { waLink } from "@/data/site";
import { en } from "@/i18n/en";

// RSC — a static link; pages pass a context-aware prefill message.
export function WhatsAppFloat({ message }: Readonly<{ message: string }>) {
  return (
    <a
      href={waLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={en.marketing.whatsapp.label}
      className="fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-sage-deep text-paper shadow-lg"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
