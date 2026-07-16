import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("round-trips the right password without storing plaintext", async () => {
    const stored = await hashPassword("Breezy123!");
    expect(stored).not.toContain("Breezy123!");
    expect(await verifyPassword("Breezy123!", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });
});
