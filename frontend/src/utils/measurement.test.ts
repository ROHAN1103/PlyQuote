import { describe, expect, it } from "vitest";
import { describeLength, formatFeetInches, parseLength } from "./measurement";

const inches = (text: string) => {
  const r = parseLength(text);
  return r.ok ? r.inches : `ERR: ${r.message}`;
};

describe("parseLength", () => {
  it.each([
    // feet and inches
    ["5'6\"", "66"], ["5' 6\"", "66"], ["5'6.5\"", "66.5"], ["5' 6.5\"", "66.5"], ["8'", "96"], ["0'6\"", "6"], ["7'3", "87"],
    // inches only
    ["66\"", "66"], ["6\"", "6"], ["66in", "66"], ["66 in", "66"], ["30.125\"", "30.125"], ["66 inches", "66"],
    // words and typographic marks
    ["5ft 6in", "66"], ["5 ft", "60"], ["5 feet 6 inches", "66"], ["5′ 6″", "66"], ["8 FT", "96"],
    // a bare number is decimal feet
    ["8", "96"], ["5.5", "66"], ["7", "84"], ["0.5", "6"], [".5", "6"], ["  8  ", "96"],
  ])("%s -> %s inches", (text, expected) => expect(inches(text)).toBe(expected));

  it("is exact: no floating point artefacts", () => {
    expect(inches("5.3333")).toBe("64");        // 63.9996 in -> 64.000 (half-up at 3 places)
    expect(inches("0.0416")).toBe("0.499");     // 0.4992 in
    expect(inches("0.1")).toBe("1.2");          // 0.1 ft; 0.1 * 12 is 1.2000000000000002 in floats
    expect(inches("2.3")).toBe("27.6");
    expect(inches("5'6.0005\"")).toBe("66.001"); // half-up from 66.0005
  });

  it("rejects what it cannot understand, with a helpful message", () => {
    for (const bad of ["", "   ", "abc", "5'6'6", "5 6", "-5", "5,5", "5..5", "1e3", "5'6\"7"]) {
      expect(parseLength(bad).ok, bad).toBe(false);
    }
    expect(inches("")).toMatch(/Enter a length/);
    expect(inches("abc")).toMatch(/Use a form like/);
  });

  it("rejects zero, too many decimals and absurd sizes", () => {
    expect(inches("0")).toMatch(/more than zero/);
    expect(inches("0\"")).toMatch(/more than zero/);
    expect(inches("5.12345")).toMatch(/at most 4 decimal/);
    expect(inches("99999999")).toMatch(/too large/);
    expect(inches("9999999.999\"")).toBe("9999999.999");
  });
});

describe("formatFeetInches", () => {
  it.each([["66.5", "5' 6.5\""], ["72", "6'"], ["9", "9\""], ["0", "0\""], ["96", "8'"], ["100.25", "8' 4.25\""], ["11.999", "11.999\""], ["", ""]])(
    "%s -> %s", (i, text) => expect(formatFeetInches(i)).toBe(text));
});

describe("round trip", () => {
  it("what we display can be typed back in and means the same thing", () => {
    for (const i of ["66.5", "72", "9", "96", "100.25", "30.125", "11.999", "1234.5"]) {
      expect(inches(formatFeetInches(i)), i).toBe(i);
    }
  });
  it("describes its interpretation", () => {
    expect(describeLength("5.5")).toBe("5' 6\" (66 in)");
    expect(describeLength("66\"")).toBe("5' 6\" (66 in)");
    expect(describeLength("nonsense")).toBeNull();
  });
});
