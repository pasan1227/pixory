"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CoverRenderer } from "@/components/editor/cover/CoverRenderer";
import { CopyLinkButton } from "@/components/my-books/CopyLinkButton";
import { DeleteBookButton } from "@/components/my-books/DeleteBookButton";
import { en } from "@/i18n/en";
import { PAGES_PER_SPREAD } from "@/lib/print-specs";
import type { PhotoDto } from "@/lib/schemas/photo";
import type { BookDocument } from "@/types/book";

// Serializable props built by the /my-books RSC page.
export type BookCardProps = Readonly<{
  bookId: string;
  document: BookDocument;
  updatedAt: string; // ISO string — Dates don't cross the RSC boundary here.
  photoCount: number;
  shareToken: string;
  photos: PhotoDto[];
}>;

const editedDateFormatter = new Intl.DateTimeFormat("en-LK", {
  day: "numeric",
  month: "short",
  // Pinned: this client component also renders on the server, and near
  // midnight a server/client timezone disagreement would format different
  // dates and break hydration. The audience timezone is fixed for v1
  // (Sri Lankan market).
  timeZone: "Asia/Colombo",
});

// One book on /my-books: read-only cover thumbnail, title + meta line, and
// the Open / copy-resume-link / two-step-delete actions.
export function BookCard({
  bookId,
  document,
  updatedAt,
  photoCount,
  shareToken,
  photos,
}: BookCardProps) {
  const photosById = useMemo(
    () => Object.fromEntries(photos.map((photo) => [photo.id, photo])),
    [photos],
  );
  const title = document.cover.title || en.editor.untitled;
  const meta = [
    en.myBooks.pagesMeta.replace(
      "{count}",
      String(document.spreads.length * PAGES_PER_SPREAD),
    ),
    en.myBooks.photosMeta.replace("{count}", String(photoCount)),
    en.myBooks.editedMeta.replace(
      "{date}",
      editedDateFormatter.format(new Date(updatedAt)),
    ),
  ].join(en.myBooks.metaSeparator);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-sand bg-white p-4">
      <div className="overflow-hidden rounded-lg shadow-sm">
        <CoverRenderer
          document={document}
          photosById={photosById}
          showSpine={false}
          showBadges={false}
          className="w-full"
        />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <p className="text-sm text-ink/60">{meta}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-start gap-2">
        <Link
          href={`/editor/${bookId}`}
          className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-5 py-2 text-sm font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
        >
          {en.myBooks.open}
        </Link>
        <CopyLinkButton shareToken={shareToken} />
        <DeleteBookButton bookId={bookId} />
      </div>
    </article>
  );
}
