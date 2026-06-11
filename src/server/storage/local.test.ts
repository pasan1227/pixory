import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorageAdapter } from "@/server/storage/local";

// Adversarial tests for src/server/storage/local.ts. Each test gets a fresh
// temp root so nothing leaks between tests or into ./storage.

let root: string;
let adapter: LocalStorageAdapter;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "pixory-local-storage-"));
  adapter = new LocalStorageAdapter(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("LocalStorageAdapter put/read", () => {
  it("roundtrips exact bytes, including all 256 byte values", async () => {
    const data = Uint8Array.from({ length: 256 }, (_, i) => i);
    await adapter.put("books/b1/photos/p1/original.jpg", data);
    const out = await adapter.read("books/b1/photos/p1/original.jpg");
    expect(out.length).toBe(256);
    expect(Buffer.from(out).equals(Buffer.from(data))).toBe(true);
  });

  it("creates nested directories on put", async () => {
    await adapter.put(
      "books/b1/photos/p1/preview.jpg",
      Uint8Array.from([1, 2, 3]),
    );
    const file = path.join(root, "books", "b1", "photos", "p1", "preview.jpg");
    const info = await stat(file);
    expect(info.isFile()).toBe(true);
  });

  it("overwriting an existing key replaces the content", async () => {
    const key = "books/b1/photos/p1/preview.jpg";
    await adapter.put(key, Uint8Array.from([1, 1, 1, 1]));
    await adapter.put(key, Uint8Array.from([9, 9]));
    const out = await adapter.read(key);
    expect(Buffer.from(out).equals(Buffer.from([9, 9]))).toBe(true);
  });
});

describe("LocalStorageAdapter delete", () => {
  it("removes the object so a subsequent read rejects", async () => {
    const key = "books/b1/photos/p1/preview.jpg";
    await adapter.put(key, Uint8Array.from([7]));
    await adapter.delete(key);
    await expect(adapter.read(key)).rejects.toThrow(/ENOENT/);
  });

  it("resolves for a missing key (rm force: true)", async () => {
    await expect(
      adapter.delete("books/never/photos/was/preview.jpg"),
    ).resolves.toBeUndefined();
  });
});

describe("LocalStorageAdapter getUrl", () => {
  it("returns the serving route path for the key", () => {
    expect(adapter.getUrl("books/abc/photos/p/preview.jpg")).toBe(
      "/api/storage/books/abc/photos/p/preview.jpg",
    );
  });
});

describe("LocalStorageAdapter rejects invalid keys before touching the filesystem", () => {
  const invalidKeys = ["../escape", "a/../b"];

  it("put / read / delete reject and getUrl throws, with the validation error (not ENOENT)", async () => {
    for (const key of invalidKeys) {
      await expect(adapter.put(key, Uint8Array.from([1]))).rejects.toThrow(
        /Invalid storage key/,
      );
      await expect(adapter.read(key)).rejects.toThrow(/Invalid storage key/);
      await expect(adapter.delete(key)).rejects.toThrow(/Invalid storage key/);
      expect(() => adapter.getUrl(key)).toThrow(/Invalid storage key/);
    }
  });

  it("leaves the storage root untouched and writes nothing outside it", async () => {
    for (const key of invalidKeys) {
      await adapter.put(key, Uint8Array.from([1])).catch(() => undefined);
    }
    // No stray files or directories under the root...
    expect(await readdir(root)).toEqual([]);
    // ...and the would-be traversal target outside the root was never created.
    await expect(stat(path.resolve(root, "..", "escape"))).rejects.toThrow(
      /ENOENT/,
    );
  });
});

describe("LocalStorageAdapter resolved-path defense in depth", () => {
  // resolve() re-checks that the resolved absolute path stays under the root
  // (startsWith root + sep). With key validation in front of it, that branch
  // is unreachable: every valid key is non-empty "/"-joined segments drawn
  // from [A-Za-z0-9._-] starting alphanumeric, with no "."/".." segments and
  // no ".." inside a segment — so path.resolve(root, key) is a purely
  // lexical descent that can never leave the root (no separators, no drive
  // colons, no traversal to climb with). That is fine: the check is O(1),
  // fails closed, and still protects against a future regression in
  // isValidStorageKey. These tests pin that every tricky-but-valid key
  // resolves inside the root and works end to end.
  it("stores tricky-but-valid keys (interior dots, dashes, underscores) inside the root", async () => {
    const trickyKeys = [
      "a.b/c.d-e_f/original.png",
      "books/x.y.z/photos/p_1-2/preview.jpg",
      "a-/b_/c./preview.jpg",
    ];
    for (const key of trickyKeys) {
      await adapter.put(key, Uint8Array.from([42]));
      const expected = path.join(root, ...key.split("/"));
      expect(expected.startsWith(root + path.sep)).toBe(true);
      expect((await stat(expected)).isFile()).toBe(true);
      const out = await adapter.read(key);
      expect(Buffer.from(out).equals(Buffer.from([42]))).toBe(true);
    }
  });
});
