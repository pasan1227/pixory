"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { orderStatusSchema } from "@/lib/schemas/order";
import { requireAdmin } from "@/server/admin";
import { adminUpdateOrderStatus } from "@/server/repositories/orders";

// Admin-only mutations. requireAdmin() is defense in depth — src/proxy.ts
// already 401s everything under /admin/* (server actions POST through the
// same matcher), but never trust a single layer.

const updateOrderStatusInputSchema = z.object({
  orderId: z.string().min(1),
  status: orderStatusSchema,
});

export async function updateOrderStatusAction(input: {
  orderId: string;
  status: string;
}): Promise<{ ok: boolean }> {
  await requireAdmin();

  const parsed = updateOrderStatusInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const updated = await adminUpdateOrderStatus(
    parsed.data.orderId,
    parsed.data.status,
  );
  if (updated === null) return { ok: false };

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}
