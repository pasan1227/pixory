// Human-facing order reference: PB-{base36 epoch-ms, uppercase}.
// Uniqueness is enforced by the DB; the repository nudges the timestamp on
// the (rare) same-millisecond collision.
export function orderReference(epochMs: number): string {
  return `PB-${epochMs.toString(36).toUpperCase()}`;
}
