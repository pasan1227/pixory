import type { Notifier } from "@/server/notify/types";
import type { OrderRecord } from "@/server/repositories/orders";

export class ConsoleNotifier implements Notifier {
  async orderReceived(order: OrderRecord): Promise<void> {
    console.info(
      `[notify] order received ${order.reference}: ${order.customerName}, ` +
        `${order.format} ${order.pageCount}pp, total LKR ${order.total}, ` +
        `pay=${order.paymentPref}, district=${order.district}`,
    );
  }
}
