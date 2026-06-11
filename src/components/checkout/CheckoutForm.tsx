"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { DeliveryFields } from "@/components/checkout/DeliveryFields";
import { GateSection } from "@/components/checkout/GateSection";
import { PaymentChoice } from "@/components/checkout/PaymentChoice";
import { PriceSummary } from "@/components/checkout/PriceSummary";
import type { DistrictId } from "@/data/districts";
import { en } from "@/i18n/en";
import { evaluateCheckoutGate } from "@/lib/checkout-gate";
import type { CompletenessIssue } from "@/lib/completeness";
import type { PriceBreakdown } from "@/lib/pricing";
import type { PaymentPreference, PlaceOrderResult } from "@/lib/schemas/order";
import { quotePriceAction } from "@/server/actions/books";
import { placeOrderAction } from "@/server/actions/orders";
import type { BookFormat } from "@/types/book";

type OrderError = Extract<PlaceOrderResult, { ok: false }>["error"];

function readField(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

const SUBMIT_CLASS =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-terracotta px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50";

// The checkout client island: gate (per-slot blank confirmations), delivery
// details, payment preference and the server-quoted price summary. All
// amounts come from the server (initial quote + quotePriceAction); nothing
// is recomputed client-side.
export function CheckoutForm({
  bookId,
  issues,
  initialPrice,
  format,
  pageCount,
}: Readonly<{
  bookId: string;
  issues: readonly CompletenessIssue[];
  initialPrice: PriceBreakdown;
  format: BookFormat;
  pageCount: number;
}>) {
  const [confirmedBlank, setConfirmedBlank] = useState<readonly string[]>([]);
  const [district, setDistrict] = useState<DistrictId | "">("");
  const [paymentPref, setPaymentPref] =
    useState<PaymentPreference>("bank_transfer");
  // The quote is stored with the district it was computed for so a stale
  // value is never shown while a re-quote is in flight or after a failure.
  const [quote, setQuote] = useState<Readonly<{
    district: DistrictId;
    value: PriceBreakdown;
  }> | null>(null);
  const [serverError, setServerError] = useState<OrderError | null>(null);
  const [pending, startTransition] = useTransition();

  const gate = useMemo(
    () => evaluateCheckoutGate(issues, confirmedBlank),
    [issues, confirmedBlank],
  );

  // Delivery is server-quoted per district. A quote for any other district
  // is ignored at render time, so failures need no state change here.
  useEffect(() => {
    if (district === "") return;
    let cancelled = false;
    quotePriceAction({ format, pageCount, district })
      .then((result) => {
        if (!cancelled && result.ok) {
          setQuote({ district, value: result.value });
        }
      })
      .catch(() => {
        // No quote for this district yet — the summary keeps showing the
        // no-district fallback until a quote for it succeeds.
      });
    return () => {
      cancelled = true;
    };
  }, [district, format, pageCount]);

  function toggleBlank(key: string): void {
    setConfirmedBlank((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function handleDistrictChange(next: DistrictId): void {
    setDistrict(next);
    // COD covers Colombo only — moving away auto-switches to bank transfer.
    if (next !== "colombo" && paymentPref === "cod") {
      setPaymentPref("bank_transfer");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!gate.ok || district === "" || pending) return;
    const data = new FormData(event.currentTarget);
    const input = {
      bookId,
      customerName: readField(data, "customerName"),
      phone: readField(data, "phone"),
      email: readField(data, "email"),
      district,
      address: readField(data, "address"),
      paymentPref,
      confirmedBlank: [...confirmedBlank],
    };
    setServerError(null);
    startTransition(async () => {
      // Success never resolves here — placeOrderAction redirects to
      // /order/[reference] and Next's redirect propagates through the
      // transition. Only resolved failure results land below.
      const result = await placeOrderAction(input);
      if (!result.ok) setServerError(result.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-start lg:gap-12"
    >
      <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1">
        <GateSection
          issues={issues}
          confirmed={confirmedBlank}
          onToggle={toggleBlank}
          editorHref={`/editor/${bookId}`}
        />
        <PriceSummary
          format={format}
          pageCount={pageCount}
          price={
            quote !== null && quote.district === district
              ? quote.value
              : initialPrice
          }
        />
      </aside>
      <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-1">
        <DeliveryFields
          district={district}
          onDistrictChange={handleDistrictChange}
          phoneError={
            serverError === "invalid_phone"
              ? en.checkout.form.errors.invalid_phone
              : null
          }
        />
        <PaymentChoice
          value={paymentPref}
          district={district}
          onChange={setPaymentPref}
        />
        <div className="flex flex-col gap-3">
          {serverError && (
            <p
              role="alert"
              className="rounded-xl border border-terracotta/40 bg-terracotta/10 px-4 py-3 text-sm font-medium text-terracotta-deep"
            >
              {en.checkout.form.errors[serverError]}
            </p>
          )}
          <button
            type="submit"
            disabled={!gate.ok || pending}
            className={SUBMIT_CLASS}
          >
            {pending ? en.checkout.form.submitting : en.checkout.form.submit}
          </button>
        </div>
      </div>
    </form>
  );
}
