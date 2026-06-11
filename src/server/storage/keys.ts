// Storage key discipline. Keys are "/"-joined segments of a tight character
// set — validated on every adapter call so a hostile key can never traverse
// outside the storage root or smuggle URL syntax.

const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isValidStorageKey(key: string): boolean {
  if (key.length === 0 || key.length > 512) return false;
  const segments = key.split("/");
  return segments.every(
    (segment) =>
      SEGMENT_PATTERN.test(segment) &&
      segment !== "." &&
      segment !== ".." &&
      !segment.includes(".."),
  );
}

export function assertValidStorageKey(key: string): void {
  if (!isValidStorageKey(key)) {
    throw new Error(`Invalid storage key: ${JSON.stringify(key)}`);
  }
}

// Canonical key shapes for photo assets.
export function photoPreviewKey(bookId: string, photoId: string): string {
  return `books/${bookId}/photos/${photoId}/preview.jpg`;
}

export function photoOriginalKey(
  bookId: string,
  photoId: string,
  extension: "jpg" | "png",
): string {
  return `books/${bookId}/photos/${photoId}/original.${extension}`;
}

// The book a key belongs to, used for ownership checks when serving.
// Returns null for keys outside the books/ namespace.
export function bookIdFromKey(key: string): string | null {
  const segments = key.split("/");
  return segments[0] === "books" && segments.length >= 2
    ? (segments[1] ?? null)
    : null;
}
