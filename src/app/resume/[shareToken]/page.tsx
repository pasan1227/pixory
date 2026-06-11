import type { Metadata } from "next";
import { en } from "@/i18n/en";
import { redeemResumeLinkAction } from "@/server/actions/resume";
import { peekBookByShareToken } from "@/server/repositories/books";

// Resume link landing. The GET is side-effect-free on purpose: WhatsApp's
// link preview and browser prefetch fetch this URL before the user taps it,
// and a single-use token must survive that. Redemption (rotate + adopt
// session) happens in the POSTed server action below — crawlers don't POST.
export const metadata: Metadata = { title: en.resume.title };

export default async function ResumePage({
  params,
}: Readonly<{ params: Promise<{ shareToken: string }> }>) {
  const { shareToken } = await params;
  const book = await peekBookByShareToken(shareToken);

  if (!book) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {en.resume.invalidTitle}
        </h1>
        <p className="text-ink/70">{en.resume.invalidBody}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {en.resume.title}
      </h1>
      {book.title !== "" && (
        <p className="font-display text-xl text-ink/80">{book.title}</p>
      )}
      <p className="text-ink/70">{en.resume.description}</p>
      <form action={redeemResumeLinkAction.bind(null, shareToken)}>
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-full bg-terracotta px-8 py-3 font-medium text-paper transition-colors duration-150 hover:bg-terracotta-deep focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 focus-visible:ring-offset-paper focus-visible:outline-none motion-reduce:transition-none"
        >
          {en.resume.cta}
        </button>
      </form>
    </main>
  );
}
