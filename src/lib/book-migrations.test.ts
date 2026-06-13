import { describe, expect, it } from "vitest";

import {
  CURRENT_SCHEMA_VERSION,
  migrateBookDocument,
} from "@/lib/book-migrations";
import { createEmptyBookDocument } from "@/lib/new-book";

describe("migrateBookDocument", () => {
  it("passes a current-version document through, schema-valid", () => {
    const doc = createEmptyBookDocument("square_20");
    const migrated = migrateBookDocument(doc);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.format).toBe("square_20");
  });

  it("lifts a v1 document to the current version", () => {
    // A v2 document with the version forced back to 1 is a valid v1 raw doc:
    // the cover emphasis fields are optional and absent.
    const v1 = { ...createEmptyBookDocument("square_26"), schemaVersion: 1 };
    const migrated = migrateBookDocument(v1);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.cover.titleStyle).toBeUndefined();
    expect(migrated.cover.subtitleStyle).toBeUndefined();
  });

  it("throws on a document newer than the current version", () => {
    const future = {
      ...createEmptyBookDocument("square_20"),
      schemaVersion: 99,
    };
    expect(() => migrateBookDocument(future)).toThrow(/newer than supported/);
  });

  it("throws on a missing schemaVersion or a non-object", () => {
    expect(() => migrateBookDocument({ format: "square_20" })).toThrow(
      /schemaVersion/,
    );
    expect(() => migrateBookDocument(null)).toThrow();
  });
});
