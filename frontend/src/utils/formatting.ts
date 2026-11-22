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
