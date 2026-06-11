// ---------------------------------------------------------------------------
// Sri Lankan mobile number validation and normalization.
//
// Accepted shapes (mobile only, after stripping formatting noise):
//   07XXXXXXXX    → normalized to +947XXXXXXXX (E.164)
//   +947XXXXXXXX  → already E.164, returned as-is
// Everything else (landlines, bare "94…", "0094…", wrong lengths) is invalid.
//
// Normalize with normalizePhoneLK() before persisting any phone number.
// ---------------------------------------------------------------------------

// Formatting noise we tolerate in user input: whitespace, hyphens, dots,
// parentheses. Nothing else is stripped.
const FORMATTING_NOISE = /[\s\-.()]/g;

const LOCAL_MOBILE = /^07\d{8}$/;
const E164_MOBILE = /^\+947\d{8}$/;

/**
 * Normalizes a Sri Lankan mobile number to E.164 ("+947XXXXXXXX").
 * Returns null when the input is not a valid Sri Lankan mobile number.
 */
export function normalizePhoneLK(input: string): string | null {
  const cleaned = input.replace(FORMATTING_NOISE, "");
  if (LOCAL_MOBILE.test(cleaned)) {
    return `+94${cleaned.slice(1)}`;
  }
  if (E164_MOBILE.test(cleaned)) {
    return cleaned;
  }
  return null;
}

/** True when the input normalizes to a valid Sri Lankan mobile number. */
export function isValidPhoneLK(input: string): boolean {
  return normalizePhoneLK(input) !== null;
}
