import { z } from "zod";
import { DISTRICT_IDS } from "@/data/districts";
import { normalizePhoneLK } from "@/lib/phone";

// Payment is a captured PREFERENCE only — no money moves in v1.
// TODO: PayHere — integration boundary lives in the order confirmation flow.
export const PAYMENT_PREFERENCES = [
  "cod",
  "bank_transfer",
  "card_payhere",
] as const;
export const paymentPreferenceSchema = z.enum(PAYMENT_PREFERENCES);
export type PaymentPreference = z.infer<typeof paymentPreferenceSchema>;

export const ORDER_STATUSES = [
  "received",
  "proofing",
  "printing",
  "dispatched",
  "delivered",
] as const;
export const orderStatusSchema = z.enum(ORDER_STATUSES);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Slot keys for per-slot "leave blank" confirmations: "cover:0:2" /
// "spread:3:1" — matches checkout-gate's slotIssueKey format.
const slotKeySchema = z.string().regex(/^(cover|spread):\d+:\d+$/);

export const checkoutFormSchema = z
  .object({
    bookId: z.string().min(1),
    customerName: z.string().trim().min(2).max(120),
    phone: z
      .string()
      .transform((value, ctx) => {
        const normalized = normalizePhoneLK(value);
        if (normalized === null) {
          ctx.addIssue({ code: "custom", message: "invalid_phone" });
          return z.NEVER;
        }
        return normalized;
      }),
    email: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .pipe(z.email().optional()),
    district: z.enum(DISTRICT_IDS),
    address: z.string().trim().min(10).max(500),
    paymentPref: paymentPreferenceSchema,
    confirmedBlank: z.array(slotKeySchema).max(500).default([]),
  })
  .refine(
    // Cash on delivery covers Colombo & suburbs only.
    (data) => data.paymentPref !== "cod" || data.district === "colombo",
    { path: ["paymentPref"], message: "cod_outside_colombo" },
  );

export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;
export type CheckoutForm = z.infer<typeof checkoutFormSchema>;

export type PlaceOrderResult =
  | { ok: true; reference: string }
  | {
      ok: false;
      error:
        | "not_found"
        | "invalid_input"
        | "gate_blocked"
        | "cod_outside_colombo"
        | "invalid_phone";
    };
