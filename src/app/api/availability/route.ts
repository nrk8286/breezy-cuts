import { addMinutes, isSameDay, set } from "date-fns";
import { bookedIntervals, listServices } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const barberId = url.searchParams.get("barberId");
  const serviceId = url.searchParams.get("serviceId");
  const dateValue = url.searchParams.get("date");
  if (!barberId || !serviceId || !dateValue) return Response.json({ error: "barberId, serviceId, and date are required." }, { status: 400 });
  const service = (await listServices()).find((item) => item.id === serviceId);
  const day = new Date(`${dateValue}T00:00:00`);
  if (!service || Number.isNaN(day.getTime()) || !isSameDay(day, new Date(dateValue + "T12:00:00"))) return Response.json({ error: "Invalid selection." }, { status: 400 });
  const open = set(day, { hours: 9, minutes: 0 });
  const close = set(day, { hours: 18, minutes: 0 });
  const intervals = await bookedIntervals(barberId, open.toISOString(), close.toISOString());
  const slots: string[] = [];
  for (let cursor = open; addMinutes(cursor, service.durationMinutes) <= close; cursor = addMinutes(cursor, 15)) {
    const end = addMinutes(cursor, service.durationMinutes);
    if (cursor.getTime() > Date.now() + 30 * 60_000 && !intervals.some((item) => cursor < new Date(item.end_time) && end > new Date(item.start_time))) slots.push(cursor.toISOString());
  }
  return Response.json({ slots });
}
