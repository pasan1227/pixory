import { describe, expect, it } from "vitest";
import {
  assertValidStorageKey,
  bookIdFromKey,
  isValidStorageKey,
  photoOriginalKey,
  photoPreviewKey,
} from "@/server/storage/keys";

// Adversarial tests for src/server/storage/keys.ts. The contract: keys are
// "/"-joined segments of [A-Za-z0-9._-] starting with an alphanumeric, no
// "."/".." (or ".." anywhere inside a segment), max 512 chars. Anything that
// could traverse outside the storage root or smuggle URL syntax is rejected.

describe("isValidStorageKey", () => {
  it("accepts the canonical photo key shapes", () => {
    expect(isValidStorageKey(photoPreviewKey("abc123", "p-1"))).toBe(true);
    expect(isValidStorageKey(photoOriginalKey("abc123", "p-1", "jpg"))).toBe(
      true,
    );
    expect(isValidStorageKey(photoOriginalKey("abc123", "p-1", "png"))).toBe(
      true,
    );
  });

  it("pins the canonical key shapes themselves", () => {
    expect(photoPreviewKey("b", "p")).toBe("books/b/photos/p/preview.jpg");
    expect(photoOriginalKey("b", "p", "png")).toBe(
      "books/b/photos/p/original.png",
    );
  });

  it("rejects the empty key", () => {
    expect(isValidStorageKey("")).toBe(false);
  });

  it('rejects ".." traversal segments anywhere in the key', () => {
    expect(isValidStorageKey("books/../x")).toBe(false);
    expect(isValidStorageKey("..")).toBe(false);
    expect(isValidStorageKey("a/..")).toBe(false);
    expect(isValidStorageKey("../a")).toBe(false);
  });

  it('rejects segments merely CONTAINING ".." (the includes check, stricter than the charset)', () => {
    // "a..b", "x.." pass the segment regex; the explicit includes("..")
    // check is what rejects them.
    expect(isValidStorageKey("a..b")).toBe(false);
    expect(isValidStorageKey("x..")).toBe(false);
    expect(isValidStorageKey("books/a..b/x")).toBe(false);
    expect(isValidStorageKey("..x")).toBe(false);
  });

  it("rejects a leading slash (empty first segment)", () => {
    expect(isValidStorageKey("/books/abc")).toBe(false);
    expect(isValidStorageKey("/")).toBe(false);
  });

  it("rejects a trailing slash (empty last segment)", () => {
    expect(isValidStorageKey("books/abc/")).toBe(false);
  });

  it("rejects empty interior segments (double slash)", () => {
    expect(isValidStorageKey("books//abc")).toBe(false);
  });

  it("rejects backslashes (Windows-style separators)", () => {
    expect(isValidStorageKey("books\\abc")).toBe(false);
    expect(isValidStorageKey("books/a\\b")).toBe(false);
    expect(isValidStorageKey("..\\escape")).toBe(false);
  });

  it('rejects percent-encoded traversal ("%" is outside the charset)', () => {
    // "%2e%2e" decodes to ".." downstream, but it never gets that far: "%"
    // is not in [A-Za-z0-9._-], so the segment pattern rejects it outright.
    expect(isValidStorageKey("%2e%2e/x")).toBe(false);
    expect(isValidStorageKey("books/%2e%2e/x")).toBe(false);
    expect(isValidStorageKey("books/a%2fb")).toBe(false);
  });

  it('rejects segments starting with "." (hidden files, bare dot)', () => {
    expect(isValidStorageKey(".hidden")).toBe(false);
    expect(isValidStorageKey("books/.hidden/x")).toBe(false);
    expect(isValidStorageKey(".")).toBe(false);
    expect(isValidStorageKey("a/.")).toBe(false);
  });

  it('rejects absolute-looking Windows drive keys (":" is outside the charset)', () => {
    expect(isValidStorageKey("C:")).toBe(false);
    expect(isValidStorageKey("C:/Windows/system32")).toBe(false);
    expect(isValidStorageKey("C:\\Windows")).toBe(false);
  });

  it("enforces the 512-char boundary exactly", () => {
    expect(isValidStorageKey("a".repeat(512))).toBe(true);
    expect(isValidStorageKey("a".repeat(513))).toBe(false);
  });

  it("rejects unicode outside the ASCII charset", () => {
    expect(isValidStorageKey("böoks/abc")).toBe(false);
    expect(isValidStorageKey("books/ෆොටෝ/p")).toBe(false);
    expect(isValidStorageKey("books/p​/x")).toBe(false); // zero-width space
  });
});

describe("assertValidStorageKey", () => {
  it("does not throw for a valid key", () => {
    expect(() =>
      assertValidStorageKey(photoPreviewKey("abc", "p1")),
    ).not.toThrow();
  });

  it("throws with the offending key in the message", () => {
    expect(() => assertValidStorageKey("../etc/passwd")).toThrow(
      '"../etc/passwd"',
    );
    expect(() => assertValidStorageKey("")).toThrow(/Invalid storage key/);
  });
});

describe("bookIdFromKey", () => {
  it("extracts the book id from a full photo key", () => {
    expect(bookIdFromKey("books/abc/photos/p/preview.jpg")).toBe("abc");
  });

  it("extracts the book id from a bare books/<id> key", () => {
    expect(bookIdFromKey("books/abc")).toBe("abc");
  });

  it('returns null for "books" with no id segment', () => {
    expect(bookIdFromKey("books")).toBeNull();
  });

  it("returns null outside the books/ namespace", () => {
    expect(bookIdFromKey("other/abc")).toBeNull();
  });

  it("returns null for the empty key", () => {
    expect(bookIdFromKey("")).toBeNull();
  });
});
