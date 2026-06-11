import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/schemas/order";

// A known-good baseline; individual tests override single fields.
const VALID: CheckoutFormInput = {
  bookId: "book_1",
  customerName: "Nimal Perera",
  phone: "0771234567",
  email: "",
  district: "colombo",
  address: "12 Galle Road, Colombo 03",
  paymentPref: "bank_transfer",
  confirmedBlank: [],
};

function parseOk(input: unknown): z.infer<typeof checkoutFormSchema> {
  const result = checkoutFormSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`expected success, got: ${result.error.message}`);
  }
  return result.data;
}

function parseFail(input: unknown): z.ZodError {
  const result = checkoutFormSchema.safeParse(input);
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("expected failure, got success");
  }
  return result.error;
}

describe("checkoutFormSchema", () => {
  describe("happy path transforms", () => {
    it("parses a fully valid input", () => {
      const data = parseOk(VALID);
      expect(data.bookId).toBe("book_1");
      expect(data.district).toBe("colombo");
      expect(data.paymentPref).toBe("bank_transfer");
    });

    it("normalizes a local phone number to E.164", () => {
      const data = parseOk({ ...VALID, phone: "0771234567" });
      expect(data.phone).toBe("+94771234567");
    });

    it("passes through an already-E.164 phone unchanged", () => {
      const data = parseOk({ ...VALID, phone: "+94771234567" });
      expect(data.phone).toBe("+94771234567");
    });

    it("normalizes a phone with formatting noise", () => {
      const data = parseOk({ ...VALID, phone: "077 123-4567" });
      expect(data.phone).toBe("+94771234567");
    });

    it("transforms empty-string email to undefined", () => {
      const data = parseOk({ ...VALID, email: "" });
      expect(data.email).toBeUndefined();
    });

    it("transforms whitespace-only email to undefined (trim first)", () => {
      const data = parseOk({ ...VALID, email: "   " });
      expect(data.email).toBeUndefined();
    });

    it("keeps a valid email", () => {
      const data = parseOk({ ...VALID, email: "x@y.lk" });
      expect(data.email).toBe("x@y.lk");
    });

    it("rejects a non-empty invalid email", () => {
      parseFail({ ...VALID, email: "not-an-email" });
    });

    it("trims the customer name", () => {
      const data = parseOk({ ...VALID, customerName: "  Nimal Perera  " });
      expect(data.customerName).toBe("Nimal Perera");
    });

    it("trims the address", () => {
      const data = parseOk({ ...VALID, address: "  12 Galle Road, Colombo 03  " });
      expect(data.address).toBe("12 Galle Road, Colombo 03");
    });
  });

  describe("phone rejections", () => {
    it("rejects a landline with message invalid_phone at path phone", () => {
      const error = parseFail({ ...VALID, phone: "0112345678" });
      const issue = error.issues.find((i) => i.path[0] === "phone");
      expect(issue?.message).toBe("invalid_phone");
    });

    it("rejects a garbage short number with message invalid_phone", () => {
      const error = parseFail({ ...VALID, phone: "12345" });
      const issue = error.issues.find((i) => i.path[0] === "phone");
      expect(issue?.message).toBe("invalid_phone");
    });
  });

  describe("cod district refinement", () => {
    it("rejects cod outside colombo with the right message and path", () => {
      const error = parseFail({
        ...VALID,
        paymentPref: "cod",
        district: "galle",
      });
      expect(error.issues).toHaveLength(1);
      expect(error.issues[0]?.message).toBe("cod_outside_colombo");
      expect(error.issues[0]?.path).toEqual(["paymentPref"]);
    });

    it("accepts cod in colombo", () => {
      const data = parseOk({ ...VALID, paymentPref: "cod", district: "colombo" });
      expect(data.paymentPref).toBe("cod");
    });

    it("accepts bank_transfer in any district", () => {
      const data = parseOk({
        ...VALID,
        paymentPref: "bank_transfer",
        district: "jaffna",
      });
      expect(data.district).toBe("jaffna");
    });

    it("accepts card_payhere in any district", () => {
      const data = parseOk({
        ...VALID,
        paymentPref: "card_payhere",
        district: "monaragala",
      });
      expect(data.paymentPref).toBe("card_payhere");
    });
  });

  describe("field bounds", () => {
    it("rejects a 1-character name", () => {
      parseFail({ ...VALID, customerName: "A" });
    });

    it("accepts a 2-character name", () => {
      const data = parseOk({ ...VALID, customerName: "Al" });
      expect(data.customerName).toBe("Al");
    });

    it("rejects a 9-character address", () => {
      expect("9 chars!!".length).toBe(9);
      parseFail({ ...VALID, address: "9 chars!!" });
    });

    it("accepts a 10-character address", () => {
      expect("10 chars!!".length).toBe(10);
      const data = parseOk({ ...VALID, address: "10 chars!!" });
      expect(data.address).toBe("10 chars!!");
    });

    it("rejects an unknown district", () => {
      parseFail({ ...VALID, district: "london" });
    });

    it("rejects an unknown payment preference", () => {
      parseFail({ ...VALID, paymentPref: "cash" });
    });

    it("rejects an empty bookId", () => {
      parseFail({ ...VALID, bookId: "" });
    });
  });

  describe("confirmedBlank", () => {
    it("defaults to [] when omitted", () => {
      const withoutConfirmed: CheckoutFormInput = {
        bookId: VALID.bookId,
        customerName: VALID.customerName,
        phone: VALID.phone,
        email: VALID.email,
        district: VALID.district,
        address: VALID.address,
        paymentPref: VALID.paymentPref,
      };
      expect("confirmedBlank" in withoutConfirmed).toBe(false);
      const data = parseOk(withoutConfirmed);
      expect(data.confirmedBlank).toEqual([]);
    });

    it("accepts valid cover and spread slot keys", () => {
      const data = parseOk({
        ...VALID,
        confirmedBlank: ["cover:0:1", "spread:12:3"],
      });
      expect(data.confirmedBlank).toEqual(["cover:0:1", "spread:12:3"]);
    });

    it.each([
      ["missing slot index", "spread:1"],
      ["unknown target", "page:1:2"],
      ["non-numeric indices", "spread:a:b"],
      ["uppercase target", "SPREAD:1:2"],
    ])("rejects malformed key (%s)", (_label, key) => {
      parseFail({ ...VALID, confirmedBlank: [key] });
    });

    it("accepts exactly 500 entries", () => {
      const keys = Array.from({ length: 500 }, (_, i) => `spread:${i}:0`);
      const data = parseOk({ ...VALID, confirmedBlank: keys });
      expect(data.confirmedBlank).toHaveLength(500);
    });

    it("rejects 501 entries (max 500)", () => {
      const keys = Array.from({ length: 501 }, (_, i) => `spread:${i}:0`);
      parseFail({ ...VALID, confirmedBlank: keys });
    });
  });
});
