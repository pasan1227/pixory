import { describe, expect, it } from "vitest";

import { isValidPhoneLK, normalizePhoneLK } from "@/lib/phone";

describe("normalizePhoneLK", () => {
  describe("local format 07XXXXXXXX", () => {
    it("normalizes a plain local mobile number to E.164", () => {
      expect(normalizePhoneLK("0771234567")).toBe("+94771234567");
    });

    it("accepts the 070 mobile range", () => {
      expect(normalizePhoneLK("0712345678")).toBe("+94712345678");
    });

    it("accepts every 07X prefix (070–079)", () => {
      for (let d = 0; d <= 9; d += 1) {
        const local = `07${d}1234567`;
        expect(normalizePhoneLK(local)).toBe(`+947${d}1234567`);
      }
    });

    it("normalizes the exact prefix digits, not just length", () => {
      // Hand-computed: "0759876543" → drop leading 0, prepend +94.
      expect(normalizePhoneLK("0759876543")).toBe("+94759876543");
    });
  });

  describe("E.164 format +947XXXXXXXX", () => {
    it("passes through an already-normalized number unchanged", () => {
      expect(normalizePhoneLK("+94771234567")).toBe("+94771234567");
    });

    it("passes through the 070 range in E.164 form", () => {
      expect(normalizePhoneLK("+94701234567")).toBe("+94701234567");
    });
  });

  describe("formatting noise stripping", () => {
    it("strips spaces", () => {
      expect(normalizePhoneLK("077 123 4567")).toBe("+94771234567");
    });

    it("strips hyphens", () => {
      expect(normalizePhoneLK("077-123-4567")).toBe("+94771234567");
    });

    it("strips parentheses and dots", () => {
      expect(normalizePhoneLK("(077) 123.4567")).toBe("+94771234567");
    });

    it("strips mixed noise around an E.164 number", () => {
      expect(normalizePhoneLK("(+94) 77-123.4567")).toBe("+94771234567");
    });

    it("strips tabs and newlines (any whitespace)", () => {
      expect(normalizePhoneLK("077\t123\n4567")).toBe("+94771234567");
    });

    it("strips leading and trailing whitespace", () => {
      expect(normalizePhoneLK("  0771234567  ")).toBe("+94771234567");
    });

    it("does not strip other separators like slashes", () => {
      expect(normalizePhoneLK("077/123-4567")).toBeNull();
    });

    it("does not strip underscores", () => {
      expect(normalizePhoneLK("077_1234567")).toBeNull();
    });
  });

  describe("rejections", () => {
    it("rejects landlines in local form (011...)", () => {
      expect(normalizePhoneLK("0112345678")).toBeNull();
    });

    it("rejects landlines in E.164 form (+9411...)", () => {
      expect(normalizePhoneLK("+94112345678")).toBeNull();
    });

    it("rejects a too-short local number", () => {
      expect(normalizePhoneLK("07712345")).toBeNull();
    });

    it("rejects a local number one digit short", () => {
      expect(normalizePhoneLK("077123456")).toBeNull();
    });

    it("rejects a local number one digit long", () => {
      expect(normalizePhoneLK("07712345678")).toBeNull();
    });

    it("rejects a too-long local number", () => {
      expect(normalizePhoneLK("077123456789")).toBeNull();
    });

    it("rejects a too-short E.164 number", () => {
      expect(normalizePhoneLK("+9477123456")).toBeNull();
    });

    it("rejects a too-long E.164 number", () => {
      expect(normalizePhoneLK("+947712345678")).toBeNull();
    });

    it("rejects a bare country code without plus", () => {
      expect(normalizePhoneLK("94771234567")).toBeNull();
    });

    it("rejects the 00 international prefix", () => {
      expect(normalizePhoneLK("00947712345678")).toBeNull();
    });

    it("rejects 0094 with a correct-length remainder", () => {
      expect(normalizePhoneLK("0094771234567")).toBeNull();
    });

    it("rejects the empty string", () => {
      expect(normalizePhoneLK("")).toBeNull();
    });

    it("rejects whitespace-only input", () => {
      expect(normalizePhoneLK("   ")).toBeNull();
    });

    it("rejects letters mixed into digits", () => {
      expect(normalizePhoneLK("077abc4567")).toBeNull();
    });

    it("rejects a plus in the wrong position", () => {
      expect(normalizePhoneLK("077+1234567")).toBeNull();
    });

    it("rejects a doubled plus", () => {
      expect(normalizePhoneLK("++94771234567")).toBeNull();
    });

    it("rejects a plus followed by a local number", () => {
      expect(normalizePhoneLK("+0771234567")).toBeNull();
    });

    it("rejects an 08X local prefix", () => {
      expect(normalizePhoneLK("0871234567")).toBeNull();
    });

    it("rejects another country code", () => {
      expect(normalizePhoneLK("+44771234567")).toBeNull();
    });
  });

  describe("invariants", () => {
    const validInputs = [
      "0771234567",
      "+94771234567",
      "077 123 4567",
      "(077) 123.4567",
      "0701112223",
      "+94 70-111 2223",
    ];

    it("is idempotent: normalizing a normalized number is a no-op", () => {
      for (const input of validInputs) {
        const once = normalizePhoneLK(input);
        expect(once).not.toBeNull();
        if (once !== null) {
          expect(normalizePhoneLK(once)).toBe(once);
        }
      }
    });

    it("always returns E.164 shape (+947 plus 8 digits) for valid input", () => {
      for (const input of validInputs) {
        expect(normalizePhoneLK(input)).toMatch(/^\+947\d{8}$/);
      }
    });

    it("is deterministic for the same input", () => {
      expect(normalizePhoneLK("0771234567")).toBe(normalizePhoneLK("0771234567"));
    });
  });
});

describe("isValidPhoneLK", () => {
  it("is true exactly when normalizePhoneLK succeeds", () => {
    const cases = [
      "0771234567",
      "+94771234567",
      "077 123 4567",
      "0112345678",
      "94771234567",
      "00947712345678",
      "",
      "077abc4567",
    ];
    for (const input of cases) {
      expect(isValidPhoneLK(input)).toBe(normalizePhoneLK(input) !== null);
    }
  });

  it("accepts a valid local mobile number", () => {
    expect(isValidPhoneLK("0712345678")).toBe(true);
  });

  it("rejects a landline", () => {
    expect(isValidPhoneLK("0112345678")).toBe(false);
  });
});
