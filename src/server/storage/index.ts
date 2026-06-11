import { LocalStorageAdapter } from "@/server/storage/local";
import type { StorageAdapter } from "@/server/storage/types";

export type { StorageAdapter } from "@/server/storage/types";

let adapter: StorageAdapter | null = null;

// Storage adapter singleton. S3/R2 seam: branch on an env var here and
// return the S3-compatible implementation — callers never know the difference.
export function getStorage(): StorageAdapter {
  adapter ??= new LocalStorageAdapter();
  return adapter;
}
