import { en } from "@/i18n/en";
import type { OrderStatus } from "@/lib/schemas/order";

// Admin status chip. Tints group the pipeline: terracotta = just received,
// sand = in production (proofing/printing), sage = on the way / done.
const BADGE_TINTS: Record<OrderStatus, string> = {
  received: "bg-terracotta/15 text-terracotta-deep",
  proofing: "bg-sand text-ink/80",
  printing: "bg-sand text-ink/80",
  dispatched: "bg-sage/25 text-sage-deep",
  delivered: "bg-sage/25 text-sage-deep",
};

type StatusBadgeProps = Readonly<{ status: OrderStatus }>;

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${BADGE_TINTS[status]}`}
    >
      {en.admin.status[status]}
    </span>
  );
}
