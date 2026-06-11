import { describe, expect, it } from "vitest";

import { orderReference } from "@/lib/order-reference";

// Fixed epochs only — no clock reads, so the suite is deterministic.
const EPOCH = 1750000000000;

describe("orderReference", () => {
  it("is PB- followed by the uppercase base36 epoch", () => {
    expect(orderReference(EPOCH)).toBe(`PB-${EPOCH.toString(36).toUpperCase()}`);
  });

  it("matches a hand-computed reference", () => {
    // 1750000000000 in base36 is "mbxstdz4".
    expect(orderReference(1750000000000)).toBe("PB-MBXSTDZ4");
  });

  it("contains no lowercase characters", () => {
    const ref = orderReference(EPOCH);
    expect(ref).toBe(ref.toUpperCase());
    expect(ref).toMatch(/^PB-[0-9A-Z]+$/);
  });

  it("produces distinct references for distinct epochs", () => {
    expect(orderReference(1750000000000)).not.toBe(orderReference(1750000000001));
    expect(orderReference(1750000000001)).not.toBe(orderReference(1750000000002));
  });

  it("adjacent epochs differ only in the final base36 digit", () => {
    expect(orderReference(1750000000001)).toBe("PB-MBXSTDZ5");
    expect(orderReference(1750000000002)).toBe("PB-MBXSTDZ6");
  });

  it("same-era epochs have equal-length references", () => {
    const epochs = [1750000000000, 1750000000001, 1759999999999, 1760000000000];
    const lengths = new Set(epochs.map((e) => orderReference(e).length));
    expect(lengths.size).toBe(1);
  });

  it("monotonic same-era epochs sort lexicographically in epoch order", () => {
    const epochs = [
      1750000000000,
      1750000000001,
      1750000001000,
      1755555555555,
      1759999999999,
      1760000000000,
    ];
    const refs = epochs.map((e) => orderReference(e));
    const sorted = [...refs].sort();
    expect(sorted).toEqual(refs);
  });
});
