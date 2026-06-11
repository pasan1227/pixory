import { NextResponse } from "next/server";
import { checkBasicAuth } from "@/server/admin";
import { getStorage } from "@/server/storage";
import { isValidStorageKey } from "@/server/storage/keys";

// Serves stored photo assets to the admin. Mirrors /api/storage/[...key],
// but gates on basic auth instead of the anonymous session cookie: the URL
// lives under /admin so the browser re-sends the credentials it already
// cached for the realm. requireAdmin() throws — a route handler must answer
// with a proper 401 challenge instead, hence checkBasicAuth directly.

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> },
): Promise<Response> {
  if (!checkBasicAuth(request.headers.get("authorization"))) {
    return new NextResponse(null, {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pixela admin"' },
    });
  }

  const { key: segments } = await params;
  const key = segments.join("/");
  if (!isValidStorageKey(key)) return notFoundResponse();

  const extension = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return notFoundResponse();

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
    return notFoundResponse();
  }
}
