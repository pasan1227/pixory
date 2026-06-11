"use client";

import { useId } from "react";
import { DISTRICTS, isDistrictId, type DistrictId } from "@/data/districts";
import { en } from "@/i18n/en";

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-sand bg-white px-3 py-2 text-ink focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:outline-none";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-ink/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-terracotta-deep">
          {error}
        </p>
      )}
    </div>
  );
}

// Delivery details: native required semantics carry first-line validation;
// the server's Zod parse (normalizePhoneLK etc.) remains authoritative and
// its phone failure surfaces under the field via phoneError.
export function DeliveryFields({
  district,
  onDistrictChange,
  phoneError,
}: Readonly<{
  district: DistrictId | "";
  onDistrictChange: (district: DistrictId) => void;
  phoneError: string | null;
}>) {
  const uid = useId();
  const ids = {
    name: `${uid}-name`,
    phone: `${uid}-phone`,
    email: `${uid}-email`,
    district: `${uid}-district`,
    address: `${uid}-address`,
  };
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-ink/60 uppercase">
        {en.checkout.form.title}
      </h2>
      <Field id={ids.name} label={en.checkout.form.name}>
        <input
          id={ids.name}
          name="customerName"
          type="text"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className={INPUT_CLASS}
        />
      </Field>
      <Field
        id={ids.phone}
        label={en.checkout.form.phone}
        hint={en.checkout.form.phoneHint}
        error={phoneError}
      >
        <input
          id={ids.phone}
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={
            phoneError
              ? `${ids.phone}-hint ${ids.phone}-error`
              : `${ids.phone}-hint`
          }
          className={INPUT_CLASS}
        />
      </Field>
      <Field id={ids.email} label={en.checkout.form.email}>
        <input
          id={ids.email}
          name="email"
          type="email"
          autoComplete="email"
          className={INPUT_CLASS}
        />
      </Field>
      <Field id={ids.district} label={en.checkout.form.district}>
        <select
          id={ids.district}
          name="district"
          required
          value={district}
          onChange={(event) => {
            if (isDistrictId(event.target.value)) {
              onDistrictChange(event.target.value);
            }
          }}
          className={INPUT_CLASS}
        >
          <option value="" disabled />
          {DISTRICTS.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id={ids.address} label={en.checkout.form.address}>
        <textarea
          id={ids.address}
          name="address"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          autoComplete="street-address"
          className={`${INPUT_CLASS} resize-y`}
        />
      </Field>
    </section>
  );
}
