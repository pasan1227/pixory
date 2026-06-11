import { ConsoleNotifier } from "@/server/notify/console";
import type { Notifier } from "@/server/notify/types";

export type { Notifier } from "@/server/notify/types";

let notifier: Notifier | null = null;

// Resend/WhatsApp seam: branch on an env var here when a real channel lands.
export function getNotifier(): Notifier {
  notifier ??= new ConsoleNotifier();
  return notifier;
}
