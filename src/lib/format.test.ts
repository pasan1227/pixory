import { describe, expect, it } from "vitest";
import { formatLKR } from "@/lib/format";

// Adversarial tests for src/lib/format.ts. The contract: all LKR amounts are
// whole rupees (integers) and this is the only place they become strings, in
// the exact shape "Rs. <en-LK grouped integer>".

describe("formatLKR", () => {
  it('formats 12,500 as "Rs. 12,500"', () => {
    expect(formatLKR(12500)).toBe("Rs. 12,500");
  });

  it('formats zero as "Rs. 0"', () => {
    expect(formatLKR(0)).toBe("Rs. 0");
  });

  it('formats 9,500 as "Rs. 9,500"', () => {
    expect(formatLKR(9500)).toBe("Rs. 9,500");
  });

  it("uses western 3-digit grouping for large amounts (not lakh grouping)", () => {
    // en-IN would render 12,50,000 — en-LK must not.
    expect(formatLKR(1250000)).toBe("Rs. 1,250,000");
  });

  it("formats sub-thousand amounts without separators", () => {
    expect(formatLKR(450)).toBe("Rs. 450");
    expect(formatLKR(999)).toBe("Rs. 999");
  });

  it("starts grouping exactly at 1,000", () => {
    expect(formatLKR(1000)).toBe("Rs. 1,000");
  });

  it("formats the pricing constants used across the app", () => {
    // Free delivery threshold and the two delivery fees from src/lib/pricing.ts.
    expect(formatLKR(15000)).toBe("Rs. 15,000");
    expect(formatLKR(450)).toBe("Rs. 450");
    expect(formatLKR(650)).toBe("Rs. 650");
  });

  it("emits only ASCII characters (plain comma and space, no NBSP)", () => {
    for (const amount of [0, 450, 9500, 12500, 1250000]) {
      const out = formatLKR(amount);
      for (const ch of out) {
        expect(ch.codePointAt(0) ?? 0).toBeLessThan(128);
      }
    }
  });
});
