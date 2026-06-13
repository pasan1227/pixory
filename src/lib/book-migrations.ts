import { bookDocumentSchema } from "@/lib/schemas/book";
import type { BookDocument } from "@/types/book";

// ---------------------------------------------------------------------------
// Book document migrations. Any change to the document shape bumps
// CURRENT_SCHEMA_VERSION and registers a step here that lifts version N
// documents to N+1. Documents are migrated on read (repository layer), never
// mutated silently.
// ---------------------------------------------------------------------------

export const CURRENT_SCHEMA_VERSION = 2;

type MigrationStep = (doc: Record<string, unknown>) => Record<string, unknown>;

// Keyed by the version the step migrates FROM.
const MIGRATIONS: Record<number, MigrationStep> = {
  // v1 -> v2: cover gained optional titleStyle/subtitleStyle (bold/italic/
  // underline). Existing documents simply have none, so the lift is a version
  // bump — the optional fields stay absent and render without emphasis.
  1: (doc) => ({ ...doc, schemaVersion: 2 }),
};

function versionOf(raw: Record<string, unknown>): number {
  const version = raw["schemaVersion"];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new Error("Book document has no valid schemaVersion");
  }
  return version;
}

// Parse a raw persisted document (e.g. JSON.parse of the DB column), applying
// any pending migrations, and validate the result against the current schema.
export function migrateBookDocument(raw: unknown): BookDocument {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Book document must be an object");
  }
  let doc = raw as Record<string, unknown>;
  let version = versionOf(doc);
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Book document schemaVersion ${version} is newer than supported ${CURRENT_SCHEMA_VERSION}`,
    );
  }
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new Error(`Missing book document migration from version ${version}`);
    }
    doc = step(doc);
    version = versionOf(doc);
  }
  return bookDocumentSchema.parse(doc);
}
