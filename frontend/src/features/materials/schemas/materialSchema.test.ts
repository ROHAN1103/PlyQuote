import { describe, expect, it } from "vitest";
import { emptyMaterialForm, materialFormSchema, toFormValues, toPayload, trimRate } from "./materialSchema";
import type { Material } from "../types";

const valid = { ...emptyMaterialForm, name: "BWP Plywood", unit: "sheet", cost_rate: "2500" };
const messages = (v: object) => {
  const r = materialFormSchema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`);
};

describe("materialFormSchema", () => {
  it("accepts a valid material and trims text", () => {
    const r = materialFormSchema.safeParse({ ...valid, name: "  BWP  ", unit: " sheet " });
    expect(r.success && r.data.name).toBe("BWP");
  });

  it("requires name, unit and cost rate", () => {
    const m = messages({ ...valid, name: " ", unit: "", cost_rate: "" });
    expect(m.some((x) => x.startsWith("name"))).toBe(true);
    expect(m.some((x) => x.startsWith("unit"))).toBe(true);
    expect(m.some((x) => x.startsWith("cost_rate"))).toBe(true);
  });

  it.each(["80.50", "2500", "0", "0.0525", "9999999999.9999"])("accepts rate %s", (rate) => {
    expect(messages({ ...valid, cost_rate: rate, selling_rate: rate })).toEqual([]);
  });

  it.each(["-1", "1.23456", "abc", "1,000", "12345678901", ".5", "1e3"])("rejects rate %s", (rate) => {
    expect(messages({ ...valid, cost_rate: rate }).some((x) => x.startsWith("cost_rate"))).toBe(true);
  });

  it("treats an empty selling rate as not set, but validates one that is given", () => {
    expect(messages({ ...valid, selling_rate: "" })).toEqual([]);
    expect(messages({ ...valid, selling_rate: "x" }).some((x) => x.startsWith("selling_rate"))).toBe(true);
  });
});

describe("payload mapping", () => {
  it("sends an empty selling rate as null and keeps rates as strings", () => {
    const p = toPayload({ ...valid, selling_rate: "" });
    expect(p.selling_rate).toBeNull();
    expect(p.cost_rate).toBe("2500");
  });

  it("trims trailing zeros from stored rates for editing, without changing the value", () => {
    expect(trimRate("2500.0000")).toBe("2500");
    expect(trimRate("80.5000")).toBe("80.5");
    expect(trimRate("0.0525")).toBe("0.0525");
    expect(trimRate("100")).toBe("100");
    const m: Material = { id: "1", name: "X", category: "plywood", brand: "", description: "", specification: "", unit: "sheet",
      cost_rate: "2500.0000", selling_rate: null, is_active: true, created_at: "", updated_at: "" };
    expect(toFormValues(m).cost_rate).toBe("2500");
    expect(toFormValues(m).selling_rate).toBe("");
  });
});
