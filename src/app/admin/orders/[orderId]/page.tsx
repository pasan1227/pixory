import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  districtLabel,
  paymentLabel,
  placedAtFormatter,
} from "@/components/admin/order-labels";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StatusForm } from "@/components/admin/StatusForm";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import { SpreadRenderer } from "@/components/editor/spread/SpreadRenderer";
import { en } from "@/i18n/en";
import { formatLKR } from "@/lib/format";
import type { PhotoDto } from "@/lib/schemas/photo";
import { requireAdmin } from "@/server/admin";
import {
  adminFindOrder,
  type AdminOrderDetail,
} from "@/server/repositories/orders";
import {
  adminListPhotosByBook,
  type PhotoRecord,
} from "@/server/repositories/photos";

export const metadata: Metadata = { title: en.admin.metaTitle };

// PhotoRecord → client DTO with ADMIN photo URLs. The session-scoped storage
// URLs from toPhotoDto would 404 here; /admin/photos/* sits behind the same
// basic-auth realm as this page, so the browser re-sends the credentials it
// already cached for /admin.
function toAdminPhotoDto(record: PhotoRecord): PhotoDto {
  return {
    id: record.id,
    previewUrl: `/admin/photos/${record.previewKey}`,
    originalUploaded: record.originalUploaded,
    width: record.width,
    height: record.height,
    fileName: record.fileName,
    capturedAt: record.capturedAt ? record.capturedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
  };
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd className="text-sm text-zinc-900">{value}</dd>
    </div>
  );
}

function CustomerCard({ order }: Readonly<{ order: AdminOrderDetail }>) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900">
        {en.admin.detail.customer}
      </h2>
      <dl className="flex flex-col gap-3">
        <DetailRow label={en.checkout.form.name} value={order.customerName} />
        <DetailRow label={en.checkout.form.phone} value={order.phone} />
        {order.email !== null && (
          <DetailRow label={en.checkout.form.email} value={order.email} />
        )}
        <DetailRow label={en.checkout.form.address} value={order.address} />
        <DetailRow
          label={en.checkout.form.district}
          value={districtLabel(order.district)}
        />
      </dl>
    </section>
  );
}

function TotalsLine({ order }: Readonly<{ order: AdminOrderDetail }>) {
  const bookLine = en.checkout.summary.book
    .replace("{format}", en.formats[order.format])
    .replace("{pages}", String(order.pageCount));
  return (
    <dl className="flex flex-col gap-1 border-t border-zinc-200 pt-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-zinc-500">{bookLine}</dt>
        <dd className="text-zinc-900 tabular-nums">
          {formatLKR(order.subtotal)}
        </dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-zinc-500">{en.checkout.summary.delivery}</dt>
        <dd className="text-zinc-900 tabular-nums">
          {order.delivery === 0
            ? en.checkout.summary.deliveryFree
            : formatLKR(order.delivery)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 font-semibold text-zinc-900">
        <dt>{en.checkout.summary.total}</dt>
        <dd className="tabular-nums">{formatLKR(order.total)}</dd>
      </div>
    </dl>
  );
}

function StatusCard({ order }: Readonly<{ order: AdminOrderDetail }>) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-zinc-900">
          {en.admin.detail.payment}
        </h2>
        <p className="text-sm text-zinc-900">
          {paymentLabel(order.paymentPref)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-xs tracking-wide text-zinc-500 uppercase">
          {en.admin.detail.statusLabel}
        </h3>
        <div>
          <StatusBadge status={order.status} />
        </div>
        <StatusForm orderId={order.id} currentStatus={order.status} />
      </div>
      {/* Plain <a>: a streamed file download, not a client navigation. */}
      <a
        href={`/admin/orders/${order.id}/photos.zip`}
        className="inline-flex min-h-11 w-fit items-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors duration-150 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:outline-none motion-reduce:transition-none"
      >
        {en.admin.detail.downloadZip}
      </a>
      <TotalsLine order={order} />
    </section>
  );
}

function SnapshotSection({
  order,
  photosById,
}: Readonly<{
  order: AdminOrderDetail;
  photosById: Record<string, PhotoDto>;
}>) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900">
          {en.admin.detail.snapshotTitle}
        </h2>
        <p className="text-sm text-zinc-600">{en.admin.detail.snapshotHint}</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <figure className="flex flex-col gap-2">
          <CoverRenderer
            document={order.snapshot}
            photosById={photosById}
            showSpine
          />
          <figcaption className="text-xs text-zinc-600">
            {en.admin.detail.coverLabel}
          </figcaption>
        </figure>
        {order.snapshot.spreads.map((spread, index) => (
          <figure key={spread.id} className="flex flex-col gap-2">
            <SpreadRenderer
              format={order.snapshot.format}
              spread={spread}
              photosById={photosById}
            />
            <figcaption className="text-xs text-zinc-600">
              {en.admin.detail.spreadLabel.replace("{n}", String(index + 1))}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

type AdminOrderDetailPageProps = Readonly<{
  params: Promise<{ orderId: string }>;
}>;

// /admin/orders/[orderId] — renders exclusively from the order's FROZEN
// document snapshot; later edits to the live book never change this page.
export default async function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  await requireAdmin();
  const { orderId } = await params;
  const order = await adminFindOrder(orderId);
  if (!order) notFound();

  const photos = await adminListPhotosByBook(order.bookId);
  const photosById = Object.fromEntries(
    photos.map((photo): [string, PhotoDto] => [photo.id, toAdminPhotoDto(photo)]),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/admin/orders"
          className="inline-flex min-h-11 w-fit items-center text-sm text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          {en.admin.detail.back}
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900">
          {en.admin.detail.title.replace("{reference}", order.reference)}
        </h1>
        <p className="text-sm text-zinc-600">
          {placedAtFormatter.format(order.createdAt)}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CustomerCard order={order} />
        <StatusCard order={order} />
      </div>
      <SnapshotSection order={order} photosById={photosById} />
    </main>
  );
}
