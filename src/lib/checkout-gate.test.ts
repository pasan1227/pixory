import { describe, expect, it } from "vitest";

import { evaluateCheckoutGate, slotIssueKey } from "@/lib/checkout-gate";
import type { CompletenessIssue, IssueKind } from "@/lib/completeness";
import { checkoutFormSchema } from "@/lib/schemas/order";

function issue(
  kind: IssueKind,
  target: "cover" | "spread",
  spreadIndex: number,
  slotIndex: number,
  dpi: number | null = null,
): CompletenessIssue {
  return { kind, target, spreadIndex, slotIndex, dpi };
}

describe("evaluateCheckoutGate", () => {
  describe("hard blockers", () => {
    it("puts blocked-res in blockers and fails the gate", () => {
      const result = evaluateCheckoutGate(
        [issue("blocked-res", "spread", 1, 0, 72)],
        [],
      );
      expect(result.ok).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]?.kind).toBe("blocked-res");
      expect(result.unconfirmedEmpty).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it("blocked-res blocks even when its slot key is in confirmedBlank", () => {
      const blocked = issue("blocked-res", "spread", 1, 0, 72);
      const result = evaluateCheckoutGate([blocked], [slotIssueKey(blocked)]);
      expect(result.ok).toBe(false);
      expect(result.blockers).toHaveLength(1);
    });

    it("missing-photo blocks even when its slot key is in confirmedBlank", () => {
      const missing = issue("missing-photo", "cover", 0, 0);
      const result = evaluateCheckoutGate([missing], [slotIssueKey(missing)]);
      expect(result.ok).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]?.kind).toBe("missing-photo");
    });
  });

  describe("empty slot confirmations", () => {
    it("unconfirmed empty slot lands in unconfirmedEmpty and fails the gate", () => {
      const result = evaluateCheckoutGate(
        [issue("empty-slot", "spread", 3, 2)],
        [],
      );
      expect(result.ok).toBe(false);
      expect(result.unconfirmedEmpty).toHaveLength(1);
      expect(result.blockers).toEqual([]);
    });

    it("confirming the exact slot key drops it and the gate passes", () => {
      const result = evaluateCheckoutGate(
        [issue("empty-slot", "spread", 3, 2)],
        ["spread:3:2"],
      );
      expect(result.ok).toBe(true);
      expect(result.unconfirmedEmpty).toEqual([]);
    });

    it("a key for a different slot does not confirm it", () => {
      const result = evaluateCheckoutGate(
        [issue("empty-slot", "spread", 0, 1)],
        ["spread:0:2"],
      );
      expect(result.ok).toBe(false);
      expect(result.unconfirmedEmpty).toHaveLength(1);
    });

    it("a key for a different spread does not confirm it", () => {
      const result = evaluateCheckoutGate(
        [issue("empty-slot", "spread", 2, 1)],
        ["spread:1:1"],
      );
      expect(result.ok).toBe(false);
      expect(result.unconfirmedEmpty).toHaveLength(1);
    });

    it("cover and spread keys with identical indices are distinct", () => {
      const coverEmpty = issue("empty-slot", "cover", 0, 1);
      // "spread:0:1" must not confirm "cover:0:1".
      const wrongTarget = evaluateCheckoutGate([coverEmpty], ["spread:0:1"]);
      expect(wrongTarget.ok).toBe(false);
      expect(wrongTarget.unconfirmedEmpty).toHaveLength(1);

      const rightTarget = evaluateCheckoutGate([coverEmpty], ["cover:0:1"]);
      expect(rightTarget.ok).toBe(true);
    });
  });

  describe("warnings", () => {
    it.each<IssueKind>(["low-res", "empty-text", "missing-title"])(
      "%s goes to warnings and never affects ok",
      (kind) => {
        const slotIndex = kind === "missing-title" ? -1 : 0;
        const result = evaluateCheckoutGate(
          [issue(kind, kind === "missing-title" ? "cover" : "spread", 0, slotIndex)],
          [],
        );
        expect(result.ok).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0]?.kind).toBe(kind);
        expect(result.blockers).toEqual([]);
        expect(result.unconfirmedEmpty).toEqual([]);
      },
    );
  });

  describe("mixed scenario", () => {
    const blocker = issue("blocked-res", "spread", 0, 0, 80);
    const emptyConfirmed = issue("empty-slot", "spread", 1, 0);
    const emptyUnconfirmed = issue("empty-slot", "spread", 2, 1);
    const warnLowRes = issue("low-res", "spread", 3, 0, 120);
    const warnText = issue("empty-text", "spread", 4, 2);
    const all = [blocker, emptyConfirmed, emptyUnconfirmed, warnLowRes, warnText];

    it("1 blocker + 2 empties (1 confirmed) + 2 warnings buckets correctly", () => {
      const result = evaluateCheckoutGate(all, [slotIssueKey(emptyConfirmed)]);
      expect(result.ok).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.unconfirmedEmpty).toHaveLength(1);
      expect(result.unconfirmedEmpty[0]).toEqual(emptyUnconfirmed);
      expect(result.warnings).toHaveLength(2);
    });

    it("fixing the blocker and confirming the second empty passes the gate", () => {
      const withoutBlocker = all.filter((i) => i !== blocker);
      const result = evaluateCheckoutGate(withoutBlocker, [
        slotIssueKey(emptyConfirmed),
        slotIssueKey(emptyUnconfirmed),
      ]);
      expect(result.ok).toBe(true);
      expect(result.blockers).toEqual([]);
      expect(result.unconfirmedEmpty).toEqual([]);
      expect(result.warnings).toHaveLength(2);
    });
  });

  describe("slotIssueKey", () => {
    it("matches the confirmedBlank schema regex for slot issues", () => {
      const keys = [
        slotIssueKey(issue("empty-slot", "cover", 0, 1)),
        slotIssueKey(issue("empty-slot", "spread", 12, 3)),
      ];
      expect(keys).toEqual(["cover:0:1", "spread:12:3"]);
      for (const key of keys) {
        expect(key).toMatch(/^(cover|spread):\d+:\d+$/);
      }
    });

    it("generated keys are accepted by checkoutFormSchema.confirmedBlank", () => {
      const keys = [
        slotIssueKey(issue("empty-slot", "cover", 0, 1)),
        slotIssueKey(issue("empty-slot", "spread", 3, 2)),
      ];
      const result = checkoutFormSchema.safeParse({
        bookId: "book_1",
        customerName: "Nimal Perera",
        phone: "0771234567",
        email: "",
        district: "colombo",
        address: "12 Galle Road, Colombo 03",
        paymentPref: "bank_transfer",
        confirmedBlank: keys,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("empty input", () => {
    it("returns ok with all buckets empty", () => {
      const result = evaluateCheckoutGate([], []);
      expect(result).toEqual({
        ok: true,
        blockers: [],
        unconfirmedEmpty: [],
        warnings: [],
      });
    });

    it("ignores stray confirmations with no matching issues", () => {
      const result = evaluateCheckoutGate([], ["spread:9:9"]);
      expect(result.ok).toBe(true);
    });
  });
});
