/**
 * Feet / inches input. People type lengths in many ways; the API wants inches (up to 3 decimals).
 * Parsing is exact (scaled integers, never floating point) so 5.3333 ft is 63.9996 in -> 64 in, not 63.99960000000001.
 *
 *   5'6"   5' 6.5"   5'   6"   5ft 6in   66in   66"   5.5 (a bare number is DECIMAL FEET)
 */
const SCALE = 10_000n;               // inputs may have up to 4 decimal places
const MAX_INCHES_SCALED = 9_999_999_999n * 10n; // 9,999,999.999 in, the API's NUMERIC(10,3) ceiling, at scale 10^4

export type ParsedLength = { ok: true; inches: string } | { ok: false; message: string };

const NUMBER = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const FEET_INCHES = new RegExp(`^${NUMBER}\\s*'\\s*(?:${NUMBER}\\s*"?)?$`);
const INCHES_ONLY = new RegExp(`^${NUMBER}\\s*"$`);
const BARE = new RegExp(`^${NUMBER}$`);

/** "5.25" -> 52500n (scale 10^4). Returns null if there are more than 4 decimal places. */
function scaled(text: string): bigint | null {
  const [whole = "0", frac = ""] = text.split(".");
  if (frac.length > 4) return null;
  return BigInt(whole || "0") * SCALE + BigInt(frac.padEnd(4, "0") || "0");
}

/** scale 10^4 -> trimmed decimal string with at most 3 places, rounded half-up. */
function toInchesString(valueScaled: bigint): string {
  const milli = (valueScaled + 5n) / 10n;                        // half-up from 4 to 3 decimal places
  const whole = milli / 1000n;
  const frac = (milli % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function normalizeLengthText(raw: string): string {
  return raw.trim().toLowerCase()
    .replace(/[′’]/g, "'").replace(/[″”]/g, '"')
    // Units glued to a digit ("66in") have no word boundary, so match "not next to another letter" instead.
    .replace(/(?<![a-z])(?:feet|foot|ft)(?![a-z])\.?/g, "'")
    .replace(/(?<![a-z])(?:inches|inch|in)(?![a-z])\.?/g, '"')
    .replace(/\s+/g, " ")
    .replace(/'\s*'/g, "'");
}

export function parseLength(raw: string): ParsedLength {
  const text = normalizeLengthText(raw);
  if (text === "") return { ok: false, message: "Enter a length, e.g. 8' or 6' 6\" or 66\"." };

  let total: bigint | null;
  let m: RegExpExecArray | null;
  if ((m = FEET_INCHES.exec(text))) {
    const feet = scaled(m[1]!);
    const inches = m[2] === undefined ? 0n : scaled(m[2]);
    total = feet === null || inches === null ? null : feet * 12n + inches;
  } else if ((m = INCHES_ONLY.exec(text))) {
    total = scaled(m[1]!);
  } else if ((m = BARE.exec(text))) {
    const feet = scaled(m[1]!);
    total = feet === null ? null : feet * 12n;                    // bare number = decimal feet
  } else {
    return { ok: false, message: "Use a form like 8', 6' 6\", 66\" or 5.5 (feet)." };
  }

  if (total === null) return { ok: false, message: "Use at most 4 decimal places." };
  if (total > MAX_INCHES_SCALED) return { ok: false, message: "That length is too large." };
  const inches = toInchesString(total);
  if (Number(inches) <= 0) return { ok: false, message: "The length must be more than zero." };
  return { ok: true, inches };
}

/** "66.5" -> `5' 6.5"`, "72" -> `6'`, "9" -> `9"`. Exact; the input is a decimal string of inches. */
export function formatFeetInches(inches: string | null | undefined): string {
  if (!inches) return "";
  const m = /^(\d+)(?:\.(\d{1,3}))?$/.exec(inches.trim());
  if (!m) return "";
  const milli = BigInt(m[1]!) * 1000n + BigInt((m[2] ?? "").padEnd(3, "0") || "0");
  const feet = milli / 12000n;
  const rest = milli % 12000n;
  const restWhole = rest / 1000n;
  const restFrac = (rest % 1000n).toString().padStart(3, "0").replace(/0+$/, "");
  const restText = restFrac ? `${restWhole}.${restFrac}` : `${restWhole}`;
  const parts: string[] = [];
  if (feet > 0n) parts.push(`${feet}'`);
  if (rest > 0n || feet === 0n) parts.push(`${restText}"`);
  return parts.join(" ");
}

/** What we understood, for echoing under the input: `= 5' 6.5" (66.5 in)`. */
export function describeLength(raw: string): string | null {
  const parsed = parseLength(raw);
  if (!parsed.ok) return null;
  return `${formatFeetInches(parsed.inches)} (${parsed.inches} in)`;
}
