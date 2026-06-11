import type { OrderRecord } from "@/server/repositories/orders";

// Notification seam. v1 logs to the console; a Resend (email) or WhatsApp
// Business implementation slots in behind this interface without touching
// any caller — actions only ever see getNotifier().
export interface Notifier {
  orderReceived(order: OrderRecord): Promise<void>;
}
