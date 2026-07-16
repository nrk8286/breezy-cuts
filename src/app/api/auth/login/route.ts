import { createSession } from "@/lib/session";
import { findUserByEmail } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { assertTrustedRequest, safeError } from "@/lib/security";
import { firstZodError, loginSchema } from "@/lib/validation";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  try {
    assertTrustedRequest(request);
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    const current = attempts.get(ip);
    if (current && current.resetAt > Date.now() && current.count >= 8) return Response.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: firstZodError(parsed.error) }, { status: 400 });
    const user = await findUserByEmail(parsed.data.email);
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      attempts.set(ip, { count: current && current.resetAt > Date.now() ? current.count + 1 : 1, resetAt: Date.now() + 15 * 60_000 });
      return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    attempts.delete(ip);
    await createSession(user.id, user.role);
    return Response.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) { return safeError(error); }
}
