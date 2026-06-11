import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidStorageKey } from "@/server/storage/keys";
import type { StorageAdapter } from "@/server/storage/types";

// Local filesystem adapter — writes under ./storage/ (gitignored), serves
// through /api/storage/[...key]. The ONLY module that touches the filesystem
// for photos.
export class LocalStorageAdapter implements StorageAdapter {
  private readonly root: string;

  constructor(root: string = path.join(process.cwd(), "storage")) {
    this.root = root;
  }

  private resolve(key: string): string {
    assertValidStorageKey(key);
    const absolute = path.resolve(this.root, key);
    // Defense in depth behind key validation.
    if (!absolute.startsWith(this.root + path.sep)) {
      throw new Error(`Storage key escapes root: ${JSON.stringify(key)}`);
    }
    return absolute;
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }

  async read(key: string): Promise<Uint8Array> {
    return readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  getUrl(key: string): string {
    assertValidStorageKey(key);
    return `/api/storage/${key}`;
  }
}
