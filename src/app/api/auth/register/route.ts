import { createSession } from "@/lib/session";
import { createUser, findUserByEmail } from "@/lib/db";
import { assertTrustedRequest, safeError } from "@/lib/security";
import { firstZodError, registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    assertTrustedRequest(request);
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: firstZodError(parsed.error) }, { status: 400 });
    if (await findUserByEmail(parsed.data.email)) return Response.json({ error: "An account already exists for that email." }, { status: 409 });
    const user = await createUser(parsed.data);
    await createSession(user.id, user.role);
    return Response.json({ user }, { status: 201 });
  } catch (error) { return safeError(error); }
}
