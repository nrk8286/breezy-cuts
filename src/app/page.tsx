import Link from "next/link";
import { ArrowRight, CalendarCheck, Scissors, ShieldCheck, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { listBarbers, listServices } from "@/lib/db";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const dynamic = "force-dynamic";

export default async function Home() {
  const [allServices, barbers] = await Promise.all([listServices(), listBarbers()]);
  const services = allServices.slice(0, 4);
  return (
    <main>
      <SiteHeader />
      <section className="hero-shell">
        <div className="hero-glow" />
        <div className="site-container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15} /> Fresh cuts made easier</div>
            <h1>Walk out feeling <em>fresh.</em></h1>
            <p>Easy booking, skilled barbers, and a cut built around you. Your next great look is only a few taps away.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/book">Book your cut <ArrowRight size={18} /></Link>
              <a className="button button-ghost" href="#services">Explore services</a>
            </div>
            <div className="trust-row">
              <span><Sparkles size={17} /> Professional service</span>
              <span><CalendarCheck size={17} /> Easy online booking</span>
              <span><ShieldCheck size={17} /> Easy cancellation</span>
            </div>
          </div>
          <div className="hero-card-wrap" aria-label="Breezy Cuts appointment preview">
            <div className="barber-pole"><span /></div>
            <div className="hero-card">
              <div className="hero-card-top"><span>YOUR NEXT CUT</span><CalendarCheck size={20} /></div>
              <div className="appointment-date"><strong>18</strong><div><span>FRIDAY</span><b>2:30 PM</b></div></div>
              <div className="appointment-rule" />
              <div className="appointment-meta"><div className="avatar avatar-dark">MR</div><div><strong>Classic Cut</strong><span>with Marcus · 35 min</span></div><b>$35</b></div>
              <div className="card-stamp"><Scissors size={17} /> BREEZY APPROVED</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section site-container" id="services">
        <div className="section-heading"><div><span className="kicker">THE MENU</span><h2>Good cuts. No guesswork.</h2></div><p>Every service starts with a quick consultation and ends with a style you can recreate at home.</p></div>
        <div className="service-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.id}>
              <span className="service-number">0{index + 1}</span><Scissors size={24} />
              <h3>{service.name}</h3><p>{service.description}</p>
              <div><span>{service.durationMinutes} min</span><strong>{money.format(service.priceCents / 100)}</strong></div>
            </article>
          ))}
        </div>
        <div className="center-action"><Link className="text-link" href="/book">See all services <ArrowRight size={17} /></Link></div>
      </section>

      <section className="barbers-section" id="team">
        <div className="site-container">
          <div className="section-heading light"><div><span className="kicker">MEET THE CREW</span><h2>Your chair is ready.</h2></div><p>Different specialties, same standard: listen first, cut with care, and keep the experience easy.</p></div>
          <div className="barber-grid">
            {barbers.map((barber) => <article className="barber-card" key={barber.id}><div className="portrait"><span>{barber.avatar}</span></div><h3>{barber.name}</h3><p>{barber.bio}</p><div>{barber.specialties.map((item) => <span key={item}>{item}</span>)}</div></article>)}
          </div>
        </div>
      </section>

      <section className="visit-section site-container" id="visit">
        <div className="visit-card"><div><span className="kicker">YOUR NEXT CUT</span><h2>Find a time that works.</h2><p>Choose a service, barber, date, and available appointment online.</p></div><Link className="button button-primary" href="/book">Find a time <ArrowRight size={18} /></Link></div>
      </section>
      <footer><div className="site-container footer-inner"><Brand /><span>© {new Date().getFullYear()} Breezy Cuts</span><span>Fresh Cuts. Easy Booking.</span></div></footer>
    </main>
  );
}

function Brand() { return <span className="brand"><span className="brand-mark"><Scissors size={19} /></span><span>BREEZY <b>CUTS</b></span></span>; }
