"use client";

import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { ArrowLeft, ArrowRight, Check, Clock3, Scissors, UserRound } from "lucide-react";
import type { Barber, Service, SessionUser } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function BookingForm({ services, barbers, user }: { services: Service[]; barbers: Barber[]; user: SessionUser | null }) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState(barbers[0]?.id ?? "");
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd"));
  const [time, setTime] = useState("10:00");
  const [form, setForm] = useState({ name: user?.name ?? "", email: user?.email ?? "", phone: "", notes: "" });
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [busy, setBusy] = useState(false);
  const service = services.find((item) => item.id === serviceId)!;
  const barber = barbers.find((item) => item.id === barberId)!;
  const days = useMemo(() => Array.from({ length: 6 }, (_, i) => addDays(new Date(), i + 1)).filter((d) => d.getDay() !== 0 && d.getDay() !== 1), []);
  const times = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:00", "13:45", "14:30", "15:15", "16:00", "16:45", "17:30"];

  async function submit() {
    setBusy(true); setError("");
    const start = new Date(`${date}T${time}:00`).toISOString();
    const response = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceId, barberId, startTime: start, customerName: form.name, customerEmail: form.email, customerPhone: form.phone, notes: form.notes }) });
    const result = await response.json() as { error?: string; id?: string };
    setBusy(false);
    if (!response.ok) { setError(result.error || "We couldn't book that time."); return; }
    setBookingId(result.id ?? ""); setStep(4);
  }

  if (step === 4) return <section className="booking-card confirmation"><span className="success-icon"><Check size={30} /></span><span className="kicker">YOU&apos;RE BOOKED</span><h2>See you in the chair.</h2><p>Your appointment with {barber.name} is confirmed for {format(new Date(`${date}T${time}:00`), "EEEE, MMMM d 'at' h:mm a")}.</p><div className="confirmation-code">Confirmation <b>{bookingId.slice(0, 8).toUpperCase()}</b></div><a className="button button-primary" href="/dashboard">View my appointments</a></section>;

  return <section className="booking-card">
    <div className="steps">{["Service", "Barber & time", "Your details"].map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span><b>{label}</b></div>)}</div>
    {step === 1 && <div className="step-panel"><h2>What are we doing?</h2><p>Pick the service that fits your look.</p><div className="choice-list">{services.map((item) => <button className={serviceId === item.id ? "choice active" : "choice"} onClick={() => setServiceId(item.id)} key={item.id}><span className="choice-icon"><Scissors size={20} /></span><span><b>{item.name}</b><small>{item.description}</small></span><span className="choice-price"><b>{money.format(item.priceCents / 100)}</b><small>{item.durationMinutes} min</small></span></button>)}</div></div>}
    {step === 2 && <div className="step-panel"><h2>Who&apos;s got you?</h2><p>Choose a barber, date, and time.</p><div className="barber-choices">{barbers.map((item) => <button className={barberId === item.id ? "barber-choice active" : "barber-choice"} onClick={() => setBarberId(item.id)} key={item.id}><span className="avatar">{item.avatar}</span><b>{item.name}</b><small>{item.specialties[0]}</small></button>)}</div><label className="field-label">Select a day</label><div className="date-strip">{days.map((item) => { const value = format(item, "yyyy-MM-dd"); return <button className={date === value ? "active" : ""} onClick={() => setDate(value)} key={value}><span>{format(item, "EEE")}</span><b>{format(item, "d")}</b></button>; })}</div><label className="field-label">Available times</label><div className="time-grid">{times.map((item) => <button className={time === item ? "active" : ""} onClick={() => setTime(item)} key={item}><Clock3 size={14} />{format(new Date(`2000-01-01T${item}:00`), "h:mm a")}</button>)}</div></div>}
    {step === 3 && <div className="step-panel"><h2>Last few details.</h2><p>We&apos;ll use these for your confirmation and reminders.</p><div className="form-grid"><label><span>Name</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label><label><span>Email</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label><label><span>Phone</span><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></label><label className="wide"><span>Notes for your barber <small>(optional)</small></span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tell us about your current style or what you're going for." /></label></div><div className="booking-summary"><UserRound size={20} /><div><b>{service.name} with {barber.name}</b><span>{format(new Date(`${date}T${time}:00`), "EEE, MMM d · h:mm a")} · {service.durationMinutes} min</span></div><strong>{money.format(service.priceCents / 100)}</strong></div>{error && <p className="form-error" role="alert">{error}</p>}</div>}
    <div className="step-actions">{step > 1 ? <button className="button button-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={17} /> Back</button> : <span />}{step < 3 ? <button className="button button-primary" onClick={() => setStep(step + 1)}>Continue <ArrowRight size={17} /></button> : <button className="button button-primary" disabled={busy || !form.name || !form.email || !form.phone} onClick={submit}>{busy ? "Booking…" : "Confirm booking"} <Check size={17} /></button>}</div>
  </section>;
}
