import { deleteSession } from "@/lib/session";
import { assertTrustedRequest, safeError } from "@/lib/security";

export async function POST(request: Request) {
  try { assertTrustedRequest(request); await deleteSession(); return Response.json({ ok: true }); }
  catch (error) { return safeError(error); }
}
