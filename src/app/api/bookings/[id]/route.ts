import { currentUser } from "@/lib/dal";
import { updateBookingStatus } from "@/lib/db";
import { assertTrustedRequest, safeError } from "@/lib/security";
import { bookingStatusSchema, firstZodError } from "@/lib/validation";

export async function PATCH(request: Request, context: RouteContext<"/api/bookings/[id]">) {
  try {
    assertTrustedRequest(request);
    const user = await currentUser();
    if (!user || !["admin", "barber"].includes(user.role)) return Response.json({ error: "Not authorized." }, { status: 403 });
    const parsed = bookingStatusSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: firstZodError(parsed.error) }, { status: 400 });
    const { id } = await context.params;
    if (!(await updateBookingStatus(id, parsed.data.status, user))) return Response.json({ error: "Booking not found or not assigned to you." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return safeError(error); }
}
