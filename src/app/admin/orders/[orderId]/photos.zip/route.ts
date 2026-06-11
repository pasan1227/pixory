import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { ZipFile } from "yazl";
import { checkBasicAuth } from "@/server/admin";
import { adminFindOrder } from "@/server/repositories/orders";
import { adminListPhotosByBook } from "@/server/repositories/photos";
import { getStorage } from "@/server/storage";

// Streams every photo of an order's book as one zip download. Basic auth is
// checked directly (requireAdmin() throws; a route handler must answer with
// a proper 401 challenge), behind the src/proxy.ts edge gate.

// "001-" index prefixes keep entries unique even when customers upload files
// with identical names; the stem is sanitized to a safe character set and
// the extension comes from the stored key (so a preview fallback is .jpg
// regardless of what the customer's file was called).
function zipEntryName(index: number, fileName: string, key: string): string {
  const extension = key.slice(key.lastIndexOf("."));
  const stem =
    fileName
      .replace(/\.[^.]*$/, "")
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .slice(0, 120) || "photo";
  return `${String(index + 1).padStart(3, "0")}-${stem}${extension}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<Response> {
  if (!checkBasicAuth(request.headers.get("authorization"))) {
    return new NextResponse(null, {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Pixela admin"' },
    });
  }

  const { orderId } = await params;
  const order = await adminFindOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const photos = await adminListPhotosByBook(order.bookId);
  const storage = getStorage();
  const zipfile = new ZipFile();
  const output = zipfile.outputStream as Readable;

  // Entries are appended SEQUENTIALLY while the response already streams
  // from outputStream: each storage read is awaited before the next begins,
  // so only one storage read is in flight at a time, and the complete zip is
  // never materialized in memory. Note yazl applies no consumer backpressure,
  // so a slow client can still let queued entries accumulate inside yazl.
  // An empty photo list still yields a valid empty zip.
  void (async () => {
    try {
      for (const [index, photo] of photos.entries()) {
        // Prefer the full-quality original; fall back to the preview when
        // the background original upload never finished.
        const key = photo.originalKey ?? photo.previewKey;
        const bytes = await storage.read(key);
        zipfile.addBuffer(
          Buffer.from(bytes),
          zipEntryName(index, photo.fileName, key),
        );
      }
      zipfile.end();
    } catch (error) {
      // Abort the download visibly instead of finishing a truncated zip.
      output.destroy(
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  })();

  return new Response(Readable.toWeb(output) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${order.reference}-photos.zip"`,
    },
  });
}
