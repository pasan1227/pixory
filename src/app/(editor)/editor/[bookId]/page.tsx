import { notFound } from "next/navigation";
import { PhotoTray } from "@/components/editor/PhotoTray";
import { en } from "@/i18n/en";
import { toPhotoDto } from "@/server/photo-dto";
import { findOwnedBook } from "@/server/repositories/books";
import { listPhotosByBook } from "@/server/repositories/photos";
import { getSessionToken } from "@/server/session";

// Minimal editor shell for the photo-tray milestone. Milestone 3 adds the
// spread canvas in the placeholder column; the tray is already in its final
// position (left column on lg+, full width on mobile).
export default async function EditorPage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;
  const sessionToken = await getSessionToken();
  if (!sessionToken) notFound();

  const book = await findOwnedBook(bookId, sessionToken);
  if (!book) notFound();

  const records = await listPhotosByBook(bookId, sessionToken);
  const initialPhotos = records.map(toPhotoDto);
  const title = book.document.cover.title.trim() || en.editor.untitled;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-100">
      <header className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
        <h1 className="truncate font-display text-lg font-semibold text-ink">
          {title}
        </h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-start">
        <aside className="w-full lg:w-80 lg:shrink-0">
          <PhotoTray bookId={book.id} initialPhotos={initialPhotos} />
        </aside>
        {/* Milestone 3: the spread canvas renders here. */}
        <div
          aria-hidden="true"
          className="hidden min-h-[480px] flex-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 lg:block"
        />
      </div>
    </div>
  );
}
