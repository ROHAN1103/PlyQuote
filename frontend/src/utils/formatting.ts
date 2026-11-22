const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4, // catalogue rates can carry up to 4 decimals
});

/** Display-only. Amounts arrive from the API as decimal strings; calculations stay on the backend. */
export function formatINR(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? inr.format(n) : "—";
}

export function isZeroAmount(value: string | number | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "" && Number(value) === 0;
}

/** "2500.0000" -> "2500", "80.5000" -> "80.5": friendlier to edit; the value is unchanged. */
export function trimDecimal(value: string): string {
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}

/** "2026-11-18" -> "18 Nov 2026". Date-only strings are parsed as local dates (no timezone shift). */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(y, m - 1, d));
}
