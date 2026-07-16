import { SiteHeader } from "@/components/site-header";
import { BookingForm } from "@/components/booking-form";
import { currentUser } from "@/lib/dal";
import { listBarbers, listServices } from "@/lib/db";
export const dynamic = "force-dynamic";

export default async function BookPage() {
  const [user, services, barbers] = await Promise.all([currentUser(), listServices(), listBarbers()]);
  return <main className="app-page"><SiteHeader /><div className="booking-shell site-container"><div className="booking-intro"><span className="kicker">BOOK ONLINE</span><h1>Let&apos;s get you <em>fresh.</em></h1><p>Choose your service, barber, and a time that works. You&apos;ll be confirmed instantly.</p></div><BookingForm services={services} barbers={barbers} user={user} /></div></main>;
}
