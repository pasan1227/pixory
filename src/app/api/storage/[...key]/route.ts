import { NextResponse } from "next/server";
import { isBookOwned } from "@/server/repositories/books";
import { getSessionToken } from "@/server/session";
import { getStorage } from "@/server/storage";
import { bookIdFromKey, isValidStorageKey } from "@/server/storage/keys";

// Serves locally-stored photo assets. Private: a key under books/{bookId}/
// is only served to the session that owns the book. With an S3/R2 adapter
// this route is bypassed entirely (getUrl returns remote URLs).

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  const { key: segments } = await params;
  const key = segments.join("/");
  if (!isValidStorageKey(key)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const bookId = bookIdFromKey(key);
  const sessionToken = await getSessionToken();
  const owned =
    bookId !== null &&
    sessionToken !== null &&
    (await isBookOwned(bookId, sessionToken));
  if (!owned) {
    // Foreign and missing assets are indistinguishable on purpose.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const bytes = await getStorage().read(key);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        // Keys are unique per photo id and contents never change in place.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
