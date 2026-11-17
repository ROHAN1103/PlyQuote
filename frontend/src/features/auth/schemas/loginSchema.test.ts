import { loginSchema } from "./loginSchema";

describe("loginSchema", () => {
  it("accepts a username and password and trims the username", () => {
    const r = loginSchema.safeParse({ username: "  admin ", password: "x" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.username).toBe("admin");
  });

  it("rejects blank fields with friendly messages", () => {
    const r = loginSchema.safeParse({ username: "   ", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const msgs = r.error.issues.map((i) => i.message);
      expect(msgs).toContain("Enter your username.");
      expect(msgs).toContain("Enter your password.");
    }
  });
});
