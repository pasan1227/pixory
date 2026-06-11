"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { en } from "@/i18n/en";
import {
  ORDER_STATUSES,
  orderStatusSchema,
  type OrderStatus,
} from "@/lib/schemas/order";
import { updateOrderStatusAction } from "@/server/actions/admin";

// How long the "Status updated" confirmation stays visible.
const SAVED_VISIBLE_MS = 2500;

type StatusFormProps = Readonly<{
  orderId: string;
  currentStatus: OrderStatus;
}>;

export function StatusForm({ orderId, currentStatus }: StatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setSaved(false);
    setFailed(false);
    try {
      const result = await updateOrderStatusAction({ orderId, status });
      if (result.ok) {
        setSaved(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaved(false), SAVED_VISIBLE_MS);
        // Pull the refreshed status badge from the server payload.
        router.refresh();
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2"
    >
      <label className="sr-only" htmlFor="admin-order-status">
        {en.admin.detail.statusLabel}
      </label>
      <select
        id="admin-order-status"
        value={status}
        onChange={(event) =>
          setStatus(orderStatusSchema.parse(event.target.value))
        }
        className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none"
      >
        {ORDER_STATUSES.map((value) => (
          <option key={value} value={value}>
            {en.admin.status[value]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-zinc-50 transition-colors duration-150 hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 motion-reduce:transition-none"
      >
        {en.admin.detail.updateStatus}
      </button>
      {saved ? (
        <span role="status" className="text-sm font-medium text-sage-deep">
          {en.admin.detail.statusSaved}
        </span>
      ) : null}
      {failed ? (
        <span role="alert" className="text-sm font-medium text-terracotta">
          {en.admin.detail.statusFailed}
        </span>
      ) : null}
    </form>
  );
}
