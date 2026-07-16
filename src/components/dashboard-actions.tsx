"use client";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@/lib/types";

export function LogoutButton({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <button aria-label="Sign out" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }}>{children}</button>;
}

export function StatusSelect({ bookingId, status }: { bookingId: string; status: BookingStatus }) {
  const router = useRouter();
  return <select aria-label="Appointment status" defaultValue={status} onChange={async (event) => { await fetch(`/api/bookings/${bookingId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: event.target.value }) }); router.refresh(); }}><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></select>;
}
