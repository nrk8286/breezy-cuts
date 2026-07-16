import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword } from "@/lib/password";
import type { Barber, BookingStatus, BookingView, Role, Service, SessionUser } from "@/lib/types";

type StoredUser = { id: string; name: string; email: string; phone: string; password_hash: string; role: Role };
type BookingInput = { customerId?: string; serviceId: string; barberId: string; customerName: string; customerEmail: string; customerPhone: string; startTime: string; notes?: string };
type BookingDatabaseStub = {
  listServices(): Promise<Service[]>; listBarbers(): Promise<Barber[]>;
  findUserByEmail(email: string): Promise<StoredUser | null>; findUserById(id: string): Promise<SessionUser | null>;
  createUser(input: { id: string; name: string; email: string; phone: string; passwordHash: string; createdAt: string }): Promise<void>;
  createBooking(input: BookingInput & { id: string }): Promise<string>;
  listBookings(user: SessionUser): Promise<BookingView[]>;
  updateBookingStatus(id: string, status: BookingStatus, user: SessionUser): Promise<boolean>;
  bookedIntervals(barberId: string, dayStart: string, dayEnd: string): Promise<{ start_time: string; end_time: string }[]>;
};

async function database() {
  const { env } = await getCloudflareContext({ async: true });
  const id = env.BOOKING_DB.idFromName("primary");
  return env.BOOKING_DB.get(id) as unknown as BookingDatabaseStub;
}

export async function listServices(): Promise<Service[]> { return (await database()).listServices(); }
export async function listBarbers(): Promise<Barber[]> { return (await database()).listBarbers(); }
export async function findUserByEmail(email: string): Promise<StoredUser | null> { return (await database()).findUserByEmail(email); }
export async function findUserById(id: string): Promise<SessionUser | null> { return (await database()).findUserById(id); }
export async function createUser(input: { name: string; email: string; phone: string; password: string }) {
  const id = crypto.randomUUID();
  await (await database()).createUser({ id, name: input.name, email: input.email, phone: input.phone, passwordHash: await hashPassword(input.password), createdAt: new Date().toISOString() });
  return { id, role: "customer" as const };
}
export async function createBooking(input: BookingInput) { return (await database()).createBooking({ ...input, id: crypto.randomUUID() }); }
export async function listBookings(user: SessionUser) { return (await database()).listBookings(user); }
export async function updateBookingStatus(id: string, status: BookingStatus, user: SessionUser) { return (await database()).updateBookingStatus(id, status, user); }
export async function bookedIntervals(barberId: string, dayStart: string, dayEnd: string) { return (await database()).bookedIntervals(barberId, dayStart, dayEnd); }
