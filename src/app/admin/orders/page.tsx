import type { Metadata } from "next";
import Link from "next/link";
import {
  districtLabel,
  paymentLabel,
  placedAtFormatter,
} from "@/components/admin/order-labels";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import { requireAdmin } from "@/server/admin";
import {
  adminListOrders,
  type OrderRecord,
} from "@/server/repositories/orders";

export const metadata: Metadata = { title: en.admin.metaTitle };

function HeaderCell({
  label,
  align = "left",
}: Readonly<{ label: string; align?: "left" | "right" }>) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 text-xs font-medium tracking-wide text-zinc-500 uppercase ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </th>
  );
}

function OrderRow({ order }: Readonly<{ order: OrderRecord }>) {
  return (
    <tr className="border-t border-zinc-200 hover:bg-zinc-50">
      <td className="px-3 py-3">
        <Link
          href={`/admin/orders/${order.id}`}
          className="inline-flex items-center font-medium whitespace-nowrap text-zinc-900 underline-offset-2 hover:underline"
        >
          {order.reference}
        </Link>
      </td>
      <td className="px-3 py-3 text-zinc-900">{order.customerName}</td>
      <td className="px-3 py-3 text-zinc-600">
        {districtLabel(order.district)}
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-zinc-600">
        {en.formats[order.format]}
      </td>
      <td className="px-3 py-3 text-right text-zinc-600 tabular-nums">
        {order.pageCount}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap text-zinc-900 tabular-nums">
        {formatLKR(order.total)}
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-zinc-600">
        {paymentLabel(order.paymentPref)}
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-zinc-600">
        {placedAtFormatter.format(order.createdAt)}
      </td>
    </tr>
  );
}

// /admin/orders — dense, zinc-chrome order list for the print operator.
export default async function AdminOrdersPage() {
  await requireAdmin();
  const orders = await adminListOrders();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">
        {en.admin.ordersTitle}
      </h1>
      {orders.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-zinc-600">
          {en.admin.empty}
        </p>
      ) : (
        // Horizontal scroll keeps the dense table usable at 360px.
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <HeaderCell label={en.admin.table.reference} />
                <HeaderCell label={en.admin.table.customer} />
                <HeaderCell label={en.admin.table.district} />
                <HeaderCell label={en.admin.table.format} />
                <HeaderCell label={en.admin.table.pages} align="right" />
                <HeaderCell label={en.admin.table.total} align="right" />
                <HeaderCell label={en.admin.table.payment} />
                <HeaderCell label={en.admin.table.status} />
                <HeaderCell label={en.admin.table.placed} />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
