import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import { FREE_DELIVERY_THRESHOLD } from "@/lib/pricing";

// RSC — static text, no interactivity.
export function AnnouncementBar() {
  return (
    <p className="w-full bg-ink px-4 py-2 text-center text-xs text-paper sm:text-sm">
      {en.marketing.announcement.replace(
        "{threshold}",
        formatLKR(FREE_DELIVERY_THRESHOLD),
      )}
    </p>
  );
}
