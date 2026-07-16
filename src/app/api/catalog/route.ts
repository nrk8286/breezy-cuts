import { listBarbers, listServices } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  const [services, barbers] = await Promise.all([listServices(), listBarbers()]);
  return Response.json({ services, barbers });
}
