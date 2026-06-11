import { describe, expect, it } from "vitest";
import { signSessionValue, verifySessionValue } from "@/server/session";

// Adversarial tests for the pure cookie-value helpers in src/server/session.ts.
// Cookie values are attacker-controlled, so verifySessionValue must return
// null — never throw — for any malformed or tampered input.
// (getSessionToken/ensureSessionToken need Next request context and are out
// of scope for node tests.)

const SECRET = "unit-test-secret-0123456789abcd";
const HEX_64 = /^[0-9a-f]{64}$/;

function signaturePart(value: string): string {
  return value.slice(value.lastIndexOf(".") + 1);
}

describe("signSessionValue", () => {
  it('produces "<token>.<hmac-hex>" with a 64-char lowercase hex signature', () => {
    const value = signSessionValue("tok-123", SECRET);
    expect(value.startsWith("tok-123.")).toBe(true);
    expect(signaturePart(value)).toMatch(HEX_64);
  });

  it("is deterministic for fixed inputs", () => {
    expect(signSessionValue("tok-123", SECRET)).toBe(
      signSessionValue("tok-123", SECRET),
    );
  });

  it("produces different signatures for different tokens", () => {
    const a = signaturePart(signSessionValue("token-a", SECRET));
    const b = signaturePart(signSessionValue("token-b", SECRET));
    expect(a).not.toBe(b);
  });
});

describe("verifySessionValue", () => {
  it("roundtrips a signed value back to the token", () => {
    const value = signSessionValue("tok-123", SECRET);
    expect(verifySessionValue(value, SECRET)).toBe("tok-123");
  });

  it("roundtrips a token containing dots (splits on the LAST dot)", () => {
    const token = "a.b.c-2026.01";
    const value = signSessionValue(token, SECRET);
    expect(verifySessionValue(value, SECRET)).toBe(token);
  });

  it("returns null for a tampered token part", () => {
    const value = signSessionValue("alpha", SECRET);
    expect(verifySessionValue(`b${value.slice(1)}`, SECRET)).toBeNull();
  });

  it("returns null for a tampered signature", () => {
    const value = signSessionValue("alpha", SECRET);
    const flipped = value.slice(-1) === "0" ? "1" : "0";
    expect(verifySessionValue(value.slice(0, -1) + flipped, SECRET)).toBeNull();
  });

  it("returns null (without throwing) for a truncated signature", () => {
    const value = signSessionValue("alpha", SECRET);
    expect(() => verifySessionValue(value.slice(0, -2), SECRET)).not.toThrow();
    expect(verifySessionValue(value.slice(0, -2), SECRET)).toBeNull();
  });

  it("returns null when verified with the wrong secret", () => {
    const value = signSessionValue("alpha", SECRET);
    expect(verifySessionValue(value, "another-secret-9876543210")).toBeNull();
  });

  it("returns null for a value without a separator", () => {
    expect(verifySessionValue("no-separator-here", SECRET)).toBeNull();
  });

  it("returns null for the empty string", () => {
    expect(verifySessionValue("", SECRET)).toBeNull();
  });

  it("returns null when the separator is the first character (empty token)", () => {
    expect(verifySessionValue(".deadbeef", SECRET)).toBeNull();
  });

  it("returns null (not a throw) for a forged signature whose char length matches but byte length differs", () => {
    // Pins the byte-length guard: timingSafeEqual throws RangeError on
    // unequal buffer lengths, so the guard must compare BYTES, not UTF-16
    // code units. "é" is 1 code unit but 2 UTF-8 bytes — this 64-char forged
    // signature would slip past a naive string-length check and turn a
    // hostile cookie into a 500 in getSessionToken. The implementation
    // converts both sides to Buffers before comparing lengths, so it must
    // return null here instead of throwing.
    const hostile = `tok.${"é"}${"a".repeat(63)}`;
    expect(() => verifySessionValue(hostile, SECRET)).not.toThrow();
    expect(verifySessionValue(hostile, SECRET)).toBeNull();
  });
});
