import { createBooking, listBookings } from "@/lib/db";
import { currentUser } from "@/lib/dal";
import { assertTrustedRequest, safeError } from "@/lib/security";
import { bookingSchema, firstZodError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  return Response.json({ bookings: await listBookings(user) });
}

export async function POST(request: Request) {
  try {
    assertTrustedRequest(request);
    const parsed = bookingSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: firstZodError(parsed.error) }, { status: 400 });
    const user = await currentUser();
    const id = await createBooking({ ...parsed.data, customerId: user?.id });
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") return Response.json({ error: "That time was just booked. Please choose another." }, { status: 409 });
    if (error instanceof Error && error.message === "INVALID_TIME") return Response.json({ error: "Choose a future appointment time." }, { status: 400 });
    if (error instanceof Error && error.message === "SERVICE_NOT_FOUND") return Response.json({ error: "That service is unavailable." }, { status: 404 });
    if (error instanceof Error && error.message === "BARBER_NOT_FOUND") return Response.json({ error: "That barber is unavailable." }, { status: 404 });
    return safeError(error);
  }
}
