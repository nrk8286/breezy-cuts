import { describe, expect, it } from "vitest";
import { bookingSchema, loginSchema, registerSchema } from "@/lib/validation";

describe("authentication validation", () => {
  it("normalizes a valid email", () => {
    expect(loginSchema.parse({ email: "  ALEX@Example.COM ", password: "strong-pass" }).email).toBe("alex@example.com");
  });
  it("rejects short passwords and malformed phone numbers", () => {
    expect(registerSchema.safeParse({ name: "A", email: "bad", phone: "abc", password: "short" }).success).toBe(false);
  });
});

describe("booking validation", () => {
  const valid = { serviceId: "550e8400-e29b-41d4-a716-446655440000", barberId: "550e8400-e29b-41d4-a716-446655440001", startTime: "2030-07-18T15:00:00.000Z", customerName: "Alex Jones", customerEmail: "alex@example.com", customerPhone: "(217) 555-0101", notes: "Low fade" };
  it("accepts a complete booking", () => expect(bookingSchema.safeParse(valid).success).toBe(true));
  it("rejects arbitrary identifiers", () => expect(bookingSchema.safeParse({ ...valid, barberId: "1 OR 1=1" }).success).toBe(false));
  it("limits notes", () => expect(bookingSchema.safeParse({ ...valid, notes: "x".repeat(501) }).success).toBe(false));
});
