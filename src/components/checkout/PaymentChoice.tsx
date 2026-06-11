"use client";

import { useId } from "react";
import type { DistrictId } from "@/data/districts";
import { en } from "@/i18n/en";
import {
  PAYMENT_PREFERENCES,
  type PaymentPreference,
} from "@/lib/schemas/order";

const OPTION_TEXT: Record<PaymentPreference, { label: string; hint: string }> =
  {
    cod: { label: en.checkout.form.payCod, hint: en.checkout.form.payCodHint },
    bank_transfer: {
      label: en.checkout.form.payBank,
      hint: en.checkout.form.payBankHint,
    },
    card_payhere: {
      label: en.checkout.form.payCard,
      hint: en.checkout.form.payCardHint,
    },
  };

const ARROW_KEY_OFFSETS: Readonly<Record<string, 1 | -1>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

// Same roving-tabindex ARIA radio pattern as CreateBookForm: the selected
// option is the single tab stop, arrows move BOTH selection and focus with
// wrapping — over the enabled options only, so a disabled COD is skipped.
function moveSelection(
  event: React.KeyboardEvent<HTMLElement>,
  enabled: readonly PaymentPreference[],
  value: PaymentPreference,
  onChange: (pref: PaymentPreference) => void,
): void {
  const offset = ARROW_KEY_OFFSETS[event.key];
  if (offset === undefined || enabled.length === 0) return;
  event.preventDefault();
  const from = Math.max(enabled.indexOf(value), 0);
  const next = enabled[(from + offset + enabled.length) % enabled.length];
  if (next === undefined) return;
  onChange(next);
  event.currentTarget
    .closest('[role="radiogroup"]')
    ?.querySelector<HTMLElement>(`[data-value="${next}"]`)
    ?.focus();
}

export function PaymentChoice({
  value,
  district,
  onChange,
}: Readonly<{
  value: PaymentPreference;
  district: DistrictId | "";
  onChange: (pref: PaymentPreference) => void;
}>) {
  const headingId = useId();
  const codEnabled = district === "colombo";
  const enabled = PAYMENT_PREFERENCES.filter(
    (id) => id !== "cod" || codEnabled,
  );
  // The single tab stop: the selection, or the first enabled option when the
  // selection itself is disabled (transiently, before the auto-switch).
  const anchor = enabled.includes(value) ? value : enabled[0];
  return (
    <section className="flex flex-col gap-3">
      <h2
        id={headingId}
        className="text-sm font-semibold tracking-wide text-ink/60 uppercase"
      >
        {en.checkout.form.payment}
      </h2>
      <div
        role="radiogroup"
        aria-labelledby={headingId}
        className="flex flex-col gap-3"
      >
        {PAYMENT_PREFERENCES.map((id) => {
          const selected = id === value;
          const isEnabled = id !== "cod" || codEnabled;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              data-value={id}
              disabled={!isEnabled}
              tabIndex={id === anchor ? 0 : -1}
              onKeyDown={(event) =>
                moveSelection(event, enabled, value, onChange)
              }
              onClick={() => onChange(id)}
              className={`flex min-h-11 flex-col gap-0.5 rounded-xl border bg-white px-4 py-3 text-left transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? "border-terracotta ring-1 ring-terracotta"
                  : "border-sand enabled:hover:border-terracotta"
              }`}
            >
              <span className="font-medium text-ink">
                {OPTION_TEXT[id].label}
              </span>
              <span className="text-sm text-ink/60">{OPTION_TEXT[id].hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
