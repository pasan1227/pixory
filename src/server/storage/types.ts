// File storage seam. ALL photo bytes flow through this interface — nothing
// outside src/server/storage/ may touch the filesystem for photo handling.
//
// Implementations: local filesystem (./storage, dev + v1 prod). An
// S3-compatible adapter (Cloudflare R2) slots in later by implementing this
// interface with presigned URLs from getUrl() — interface only in v1, no SDK.
export interface StorageAdapter {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  // Bytes back out — serving route, admin zip export, print pipeline.
  read(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  // URL the browser can fetch. Local: served by /api/storage/[...key].
  // S3/R2: a presigned or public CDN URL.
  getUrl(key: string): string;
}
