import { describe, expect, it } from "vitest";
import { formatINR, isZeroAmount } from "./formatting";
import { fractionToPercent, percentToFraction } from "./percent";

describe("formatINR", () => {
  it.each([
    ["2500", "₹2,500.00"],
    [2500, "₹2,500.00"],
    ["0.0525", "₹0.0525"],
    ["1234567.5", "₹12,34,567.50"], // Indian digit grouping
    ["0", "₹0.00"],
  ])("formats %s", (input, expected) => expect(formatINR(input)).toBe(expected));

  it.each([[null], [undefined], [""], ["abc"]])("shows a dash for %s", (v) => expect(formatINR(v as never)).toBe("—"));
  it("detects zero amounts", () => {
    expect(isZeroAmount("0.0000")).toBe(true);
    expect(isZeroAmount("0.0001")).toBe(false);
    expect(isZeroAmount(null)).toBe(false);
  });
});

describe("percent <-> fraction (string based, no floats)", () => {
  it.each([
    ["0.1800", "18"], ["0.18", "18"], ["0.055", "5.5"], ["1.0000", "100"], ["0", "0"],
    ["0.0525", "5.25"], ["0.0500", "5"], ["", ""], [null, ""],
  ])("fractionToPercent(%s) = %s", (f, p) => expect(fractionToPercent(f)).toBe(p));

  it.each([
    ["18", "0.18"], ["5.5", "0.055"], ["100", "1"], ["0", "0"], ["12.34", "0.1234"], ["7", "0.07"], ["0.5", "0.005"],
  ])("percentToFraction(%s) = %s", (p, f) => expect(percentToFraction(p)).toBe(f));

  it.each([["abc"], ["18.123"], [""], ["-5"], ["1e2"]])("rejects %s", (p) => expect(percentToFraction(p)).toBeNull());

  it("round-trips, including values where float maths would drift", () => {
    for (const p of ["18", "5.5", "12.34", "0.07", "28", "0.1", "9.99"]) {
      expect(fractionToPercent(percentToFraction(p)!)).toBe(p);
    }
    expect(percentToFraction("0.07")).toBe("0.0007"); // 0.07 * 0.01 is 0.0007000000000000001 in float maths
  });
});

import { formatDate, trimDecimal } from "./formatting";

describe("formatDate / trimDecimal", () => {
  it("formats date-only strings without a timezone shift", () => {
    expect(formatDate("2026-11-18")).toBe("18 Nov 2026");
    expect(formatDate("2026-01-01")).toBe("01 Jan 2026");
    expect(formatDate("")).toBe("—");
    expect(formatDate(null)).toBe("—");
  });
  it.each([["2500.0000", "2500"], ["80.5000", "80.5"], ["0.0525", "0.0525"], ["100", "100"], ["10.0000", "10"], ["0.0000", "0"]])(
    "trimDecimal(%s) = %s", (a, b) => expect(trimDecimal(a)).toBe(b));
});
