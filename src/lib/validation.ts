import { z } from "zod";

export const emailSchema = z.string().trim().email().max(160).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: z.string().trim().regex(/^[+()\-\s\d]{7,24}$/, "Enter a valid phone number"),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  barberId: z.string().uuid(),
  startTime: z.string().datetime({ offset: true }),
  customerName: z.string().trim().min(2).max(80),
  customerEmail: emailSchema,
  customerPhone: z.string().trim().regex(/^[+()\-\s\d]{7,24}$/, "Enter a valid phone number"),
  notes: z.string().trim().max(500).optional().default(""),
});

export const bookingStatusSchema = z.object({
  status: z.enum(["confirmed", "completed", "cancelled", "no_show"]),
});

export function firstZodError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check your information.";
}
