/**
 * Convert between a decimal fraction ("0.18", as the API stores tax rates) and the percentage a person
 * types ("18"). Done by shifting the decimal point in the string, never with floating-point maths.
 */
const FRACTION_RE = /^(\d+)(?:\.(\d+))?$/;
export const PERCENT_INPUT_RE = /^\d{1,3}(\.\d{1,2})?$/; // 0–999.99; the form also caps at 100

function tidy(int: string, frac: string): string {
  const i = int.replace(/^0+(?=\d)/, "") || "0";
  const f = frac.replace(/0+$/, "");
  return f ? `${i}.${f}` : i;
}

export function fractionToPercent(fraction: string | null | undefined): string {
  if (!fraction) return "";
  const m = FRACTION_RE.exec(fraction.trim());
  if (!m) return "";
  const frac = (m[2] ?? "").padEnd(2, "0");
  return tidy(m[1]! + frac.slice(0, 2), frac.slice(2));
}

export function percentToFraction(percent: string): string | null {
  const text = percent.trim();
  if (!PERCENT_INPUT_RE.test(text)) return null;
  const [i = "0", f = ""] = text.split(".");
  const padded = i.padStart(2, "0");
  return tidy(padded.slice(0, -2), padded.slice(-2) + f);
}
