import { DurableObject } from "cloudflare:workers";
import type { Barber, BookingStatus, BookingView, Service, SessionUser } from "./src/lib/types";
import { hashPassword, verifyPassword } from "./src/lib/password";

type AppEnv = CloudflareEnv & { SESSION_SECRET: string };
export default { fetch: (request: Request, env: AppEnv) => route(request, env) } satisfies ExportedHandler<AppEnv>;

export class BreezyDatabase extends DurableObject<CloudflareEnv> {
  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, phone TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('customer','barber','admin')), created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS barbers (id TEXT PRIMARY KEY, user_id TEXT UNIQUE, name TEXT NOT NULL, bio TEXT NOT NULL, specialties TEXT NOT NULL, avatar TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS services (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, duration_minutes INTEGER NOT NULL, price_cents INTEGER NOT NULL, category TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, customer_id TEXT, service_id TEXT NOT NULL, barber_id TEXT NOT NULL, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL, customer_phone TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'confirmed', notes TEXT, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS booking_slots (barber_id TEXT NOT NULL, slot_time TEXT NOT NULL, booking_id TEXT NOT NULL, PRIMARY KEY (barber_id, slot_time));
        CREATE TABLE IF NOT EXISTS internal_migrations (name TEXT PRIMARY KEY, completed_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_bookings_barber_time ON bookings(barber_id, start_time, end_time);
        CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id, start_time);
        CREATE INDEX IF NOT EXISTS idx_booking_slots_booking ON booking_slots(booking_id);
        INSERT OR IGNORE INTO services VALUES
          ('svc-classic-cut','Classic Cut','Consultation, tailored cut, hot towel finish, and style.',35,3500,'Cuts',1),
          ('svc-cut-beard','Cut + Beard','A precision haircut paired with a beard shape-up and finish.',50,5000,'Combos',1),
          ('svc-kids-cut','Kids Cut','A patient, comfortable cut for guests age 12 and under.',30,2800,'Cuts',1),
          ('svc-line-up','Line Up','Crisp edges around the hairline, temples, and neck.',20,2000,'Details',1),
          ('svc-beard-sculpt','Beard Sculpt','Beard trim, shape, hot towel, and conditioning treatment.',25,2500,'Beard',1);
        INSERT OR IGNORE INTO barbers VALUES
          ('barber-marcus-reed',NULL,'Marcus Reed','Fade specialist with a clean, detail-first approach.','Fades,Texture,Beards','MR',1),
          ('barber-jalen-brooks',NULL,'Jalen Brooks','Classic barbering and modern styles for every generation.','Classic cuts,Kids,Scissor work','JB',1),
          ('barber-tasha-green',NULL,'Tasha Green','Sharp lines, creative cuts, and an easy chair-side vibe.','Designs,Line ups,Loc maintenance','TG',1);
        DELETE FROM booking_slots WHERE booking_id IN (SELECT id FROM bookings WHERE customer_email LIKE '%@example.test') AND NOT EXISTS (SELECT 1 FROM internal_migrations WHERE name = 'launch_cleanup_v1');
        DELETE FROM bookings WHERE customer_email LIKE '%@example.test' AND NOT EXISTS (SELECT 1 FROM internal_migrations WHERE name = 'launch_cleanup_v1');
        DELETE FROM users WHERE email LIKE '%@example.test' AND NOT EXISTS (SELECT 1 FROM internal_migrations WHERE name = 'launch_cleanup_v1');
        INSERT OR IGNORE INTO internal_migrations VALUES ('launch_cleanup_v1', datetime('now'));
      `);
    });
  }

  listServices(): Service[] {
    return this.ctx.storage.sql.exec("SELECT id, name, description, duration_minutes, price_cents, category FROM services WHERE active = 1 ORDER BY price_cents").toArray().map((row) => ({ id: String(row.id), name: String(row.name), description: String(row.description), durationMinutes: Number(row.duration_minutes), priceCents: Number(row.price_cents), category: String(row.category) }));
  }
  listBarbers(): Barber[] {
    return this.ctx.storage.sql.exec("SELECT id, name, bio, specialties, avatar FROM barbers WHERE active = 1 ORDER BY name").toArray().map((row) => ({ id: String(row.id), name: String(row.name), bio: String(row.bio), avatar: String(row.avatar), specialties: String(row.specialties).split(",") }));
  }
  findUserByEmail(email: string) { return this.ctx.storage.sql.exec("SELECT id, name, email, phone, password_hash, role FROM users WHERE email = ? COLLATE NOCASE", email).toArray()[0] ?? null; }
  findUserById(id: string) { return (this.ctx.storage.sql.exec<SessionUser>("SELECT id, name, email, role FROM users WHERE id = ?", id).toArray()[0] ?? null); }
  createUser(input: { id: string; name: string; email: string; phone: string; passwordHash: string; createdAt: string }) {
    this.ctx.storage.sql.exec("INSERT INTO users (id, name, email, phone, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, 'customer', ?)", input.id, input.name, input.email, input.phone, input.passwordHash, input.createdAt);
  }
  createBooking(input: { id: string; customerId?: string; serviceId: string; barberId: string; customerName: string; customerEmail: string; customerPhone: string; startTime: string; notes?: string }) {
    const service = this.ctx.storage.sql.exec<{ duration_minutes: number }>("SELECT duration_minutes FROM services WHERE id = ? AND active = 1", input.serviceId).toArray()[0];
    if (!service) throw new Error("SERVICE_NOT_FOUND");
    if (!this.ctx.storage.sql.exec("SELECT id FROM barbers WHERE id = ? AND active = 1", input.barberId).toArray()[0]) throw new Error("BARBER_NOT_FOUND");
    const start = new Date(input.startTime); if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() + 30 * 60_000) throw new Error("INVALID_TIME");
    const end = new Date(start.getTime() + service.duration_minutes * 60_000);
    try {
      this.ctx.storage.transactionSync(() => {
        this.ctx.storage.sql.exec("INSERT INTO bookings (id, customer_id, service_id, barber_id, customer_name, customer_email, customer_phone, start_time, end_time, status, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)", input.id, input.customerId ?? null, input.serviceId, input.barberId, input.customerName, input.customerEmail, input.customerPhone, start.toISOString(), end.toISOString(), input.notes || null, new Date().toISOString());
        for (let time = start.getTime(); time < end.getTime(); time += 15 * 60_000) this.ctx.storage.sql.exec("INSERT INTO booking_slots (barber_id, slot_time, booking_id) VALUES (?, ?, ?)", input.barberId, new Date(time).toISOString(), input.id);
      });
    } catch (error) { if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) throw new Error("SLOT_TAKEN"); throw error; }
    return input.id;
  }
  listBookings(user: SessionUser): BookingView[] {
    const select = `SELECT b.id, b.start_time, b.end_time, b.status, b.notes, b.customer_name, b.customer_email, b.customer_phone, s.name AS service_name, s.duration_minutes, s.price_cents, br.name AS barber_name, br.id AS barber_id FROM bookings b JOIN services s ON s.id = b.service_id JOIN barbers br ON br.id = b.barber_id`;
    const rows = user.role === "customer" ? this.ctx.storage.sql.exec(`${select} WHERE b.customer_id = ? OR b.customer_email = ? COLLATE NOCASE ORDER BY b.start_time`, user.id, user.email).toArray() : user.role === "barber" ? this.ctx.storage.sql.exec(`${select} JOIN barbers mine ON mine.id = b.barber_id WHERE mine.user_id = ? ORDER BY b.start_time`, user.id).toArray() : this.ctx.storage.sql.exec(`${select} ORDER BY b.start_time`).toArray();
    return rows.map((row) => ({ id: String(row.id), startTime: String(row.start_time), endTime: String(row.end_time), status: row.status as BookingStatus, notes: row.notes ? String(row.notes) : null, customerName: String(row.customer_name), customerEmail: String(row.customer_email), customerPhone: String(row.customer_phone), serviceName: String(row.service_name), durationMinutes: Number(row.duration_minutes), priceCents: Number(row.price_cents), barberName: String(row.barber_name), barberId: String(row.barber_id) }));
  }
  updateBookingStatus(id: string, status: BookingStatus, user: SessionUser) {
    if (user.role === "customer") return false;
    const result = user.role === "admin" ? this.ctx.storage.sql.exec("UPDATE bookings SET status = ? WHERE id = ?", status, id) : this.ctx.storage.sql.exec("UPDATE bookings SET status = ? WHERE id = ? AND barber_id IN (SELECT id FROM barbers WHERE user_id = ?)", status, id, user.id);
    if (result.rowsWritten > 0 && ["cancelled", "no_show"].includes(status)) this.ctx.storage.sql.exec("DELETE FROM booking_slots WHERE booking_id = ?", id);
    return result.rowsWritten > 0;
  }
  bookedIntervals(barberId: string, dayStart: string, dayEnd: string) { return this.ctx.storage.sql.exec<{ start_time: string; end_time: string }>("SELECT start_time, end_time FROM bookings WHERE barber_id = ? AND status NOT IN ('cancelled','no_show') AND start_time < ? AND end_time > ?", barberId, dayEnd, dayStart).toArray(); }
}

function stub(env: AppEnv) { return env.BOOKING_DB.get(env.BOOKING_DB.idFromName("primary")); }
const json = (value: unknown, status = 200, headers?: HeadersInit) => Response.json(value, { status, headers });
const cookieName = "breezy_session";

function trusted(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).host === new URL(request.url).host;
}
function bytesToBase64(bytes: Uint8Array) { let value = ""; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function base64ToBytes(value: string) { const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)); }
async function sign(value: string, secret: string) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return bytesToBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)))); }
async function sessionToken(user: SessionUser, secret: string) { const payload = bytesToBase64(new TextEncoder().encode(JSON.stringify({ ...user, exp: Date.now() + 7 * 86400_000 }))); return `${payload}.${await sign(payload, secret)}`; }
async function session(request: Request, env: AppEnv): Promise<SessionUser | null> {
  const raw = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!raw) return null; const [payload, supplied] = raw.split("."); if (!payload || !supplied || await sign(payload, env.SESSION_SECRET) !== supplied) return null;
  try { const parsed = JSON.parse(new TextDecoder().decode(base64ToBytes(payload))) as SessionUser & { exp: number }; return parsed.exp > Date.now() ? parsed : null; } catch { return null; }
}
function sessionCookie(token: string) { return `${cookieName}=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`; }

async function route(request: Request, env: AppEnv): Promise<Response> {
  const url = new URL(request.url); const db = stub(env);
  try {
    if (url.pathname === "/" && request.method === "GET") return new Response(APP_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" } });
    if (url.pathname === "/manifest.webmanifest") return json({ name: "Breezy Cuts", short_name: "Breezy Cuts", start_url: "/", display: "standalone", background_color: "#0B1F33", theme_color: "#0B1F33", icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }] }, 200, { "Content-Type": "application/manifest+json" });
    if (url.pathname === "/api/catalog" && request.method === "GET") return json({ services: await db.listServices(), barbers: await db.listBarbers() });
    if (!trusted(request)) return json({ error: "Request origin was rejected." }, 403);
    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      const input = await request.json() as Record<string, string>; if (!input.name || !/^\S+@\S+\.\S+$/.test(input.email || "") || !input.phone || (input.password?.length ?? 0) < 8) return json({ error: "Enter a name, valid email, phone, and password of at least 8 characters." }, 400);
      if (!(await env.AUTH_RATE_LIMITER.limit({ key: `register:${input.email.toLowerCase()}` })).success) return json({ error: "Too many attempts. Try again in a minute." }, 429);
      if (await db.findUserByEmail(input.email)) return json({ error: "An account already exists for that email." }, 409);
      const user = { id: crypto.randomUUID(), name: input.name.trim(), email: input.email.toLowerCase(), role: "customer" as const };
      await db.createUser({ id: user.id, name: user.name, email: user.email, phone: input.phone.trim(), passwordHash: await hashPassword(input.password), createdAt: new Date().toISOString() });
      return json({ user }, 201, { "Set-Cookie": sessionCookie(await sessionToken(user, env.SESSION_SECRET)) });
    }
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const input = await request.json() as Record<string, string>; const stored = await db.findUserByEmail(input.email || "");
      if (!(await env.AUTH_RATE_LIMITER.limit({ key: `login:${(input.email || "unknown").toLowerCase()}` })).success) return json({ error: "Too many attempts. Try again in a minute." }, 429);
      if (!stored || !(await verifyPassword(input.password || "", String(stored.password_hash)))) return json({ error: "Email or password is incorrect." }, 401);
      const user = { id: String(stored.id), name: String(stored.name), email: String(stored.email), role: stored.role as SessionUser["role"] };
      return json({ user }, 200, { "Set-Cookie": sessionCookie(await sessionToken(user, env.SESSION_SECRET)) });
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") return json({ ok: true }, 200, { "Set-Cookie": `${cookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
    if (url.pathname === "/api/me" && request.method === "GET") return json({ user: await session(request, env) });
    if (url.pathname === "/api/bookings" && request.method === "GET") { const user = await session(request, env); return user ? json({ bookings: await db.listBookings(user) }) : json({ error: "Sign in required." }, 401); }
    if (url.pathname === "/api/bookings" && request.method === "POST") {
      const input = await request.json() as Record<string, string>; const user = await session(request, env);
      if (!input.serviceId || !input.barberId || !input.customerName || !/^\S+@\S+\.\S+$/.test(input.customerEmail || "") || !input.customerPhone) return json({ error: "Complete every required booking field." }, 400);
      const id = await db.createBooking({ id: crypto.randomUUID(), customerId: user?.id, serviceId: input.serviceId, barberId: input.barberId, customerName: input.customerName.trim(), customerEmail: input.customerEmail.toLowerCase(), customerPhone: input.customerPhone.trim(), startTime: input.startTime, notes: input.notes?.trim() });
      return json({ id }, 201);
    }
    return json({ error: "Not found." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("SLOT_TAKEN")) return json({ error: "That time was just booked. Choose another." }, 409);
    if (message.includes("INVALID_TIME")) return json({ error: "Choose an appointment at least 30 minutes from now." }, 400);
    console.error(error); return json({ error: "Something went wrong. Please try again." }, 500);
  }
}

const APP_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0B1F33"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><title>Breezy Cuts | Fresh Cuts. Easy Booking.</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4efe6;color:#0b1f33;font:16px Arial,sans-serif}header{background:#0b1f33;color:#fff;padding:18px 5%;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:2}.brand{font-weight:900;letter-spacing:.08em}.brand b{color:#21b8b5}button,.btn{border:0;border-radius:999px;padding:13px 19px;font-weight:800;cursor:pointer;background:#21b8b5;color:#0b1f33}.ghost{background:transparent;color:inherit;border:1px solid #9db0bb}.hero{background:#0b1f33;color:#fff;padding:70px 5% 85px}.hero>div,.wrap{max-width:1080px;margin:auto}.eyebrow{color:#21b8b5;font-weight:800;letter-spacing:.1em}.hero h1{font-size:clamp(44px,9vw,82px);line-height:.94;margin:18px 0}.hero p{font-size:19px;max-width:570px;color:#dce8eb}.wrap{padding:56px 5%}h2{font-size:34px;margin:0 0 24px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{background:#fff;border-radius:22px;padding:22px;box-shadow:0 8px 30px #0b1f3312}.card h3{margin:9px 0}.price{font-size:23px;font-weight:900;color:#168e8b}.booking{background:#fff;border-radius:28px;padding:clamp(20px,5vw,42px);margin-top:30px}.fields{display:grid;grid-template-columns:repeat(2,1fr);gap:15px}label{display:grid;gap:7px;font-weight:700}input,select,textarea{width:100%;padding:13px;border:1px solid #bdc8ca;border-radius:11px;font:inherit}.full{grid-column:1/-1}.notice{padding:13px;border-radius:10px;background:#ddf6f5;margin:14px 0}.error{background:#ffe2df;color:#8a1f18}.account{background:#0b1f33;color:#fff}.tabs{display:flex;gap:8px;margin-bottom:20px}.hidden{display:none}.appointments{display:grid;gap:10px;margin-top:20px}.appointment{padding:15px;border:1px solid #d3dfdf;border-radius:12px}footer{text-align:center;padding:35px;color:#637074}@media(max-width:650px){.fields{grid-template-columns:1fr}.full{grid-column:auto}.hero{padding-top:52px}header .ghost{padding:9px 12px}}
</style></head><body><header><div class="brand">BREEZY <b>CUTS</b></div><button class="ghost" onclick="document.querySelector('#account').scrollIntoView()">My account</button></header><section class="hero"><div><div class="eyebrow">FRESH CUTS MADE EASIER</div><h1>Your next fresh cut starts here.</h1><p>Choose your service, barber, date, and time. Professional service with easy online booking.</p><button onclick="document.querySelector('#book').scrollIntoView()">Book your cut</button></div></section><main><section class="wrap"><h2>Services</h2><div id="services" class="grid"></div><div id="book" class="booking"><h2>Book an appointment</h2><form id="bookingForm" class="fields"><label>Service<select id="service" required></select></label><label>Barber<select id="barber" required></select></label><label>Date<input id="date" type="date" required></label><label>Time<input id="time" type="time" value="10:00" required></label><label>Name<input id="name" autocomplete="name" required></label><label>Email<input id="email" type="email" autocomplete="email" required></label><label>Phone<input id="phone" autocomplete="tel" required></label><label>Notes<textarea id="notes"></textarea></label><div class="full"><button type="submit">Confirm booking</button><div id="bookingMessage"></div></div></form></div></section><section id="account" class="account"><div class="wrap"><h2>Your Breezy account</h2><div id="signedOut"><div class="tabs"><button onclick="mode('login')">Sign in</button><button class="ghost" onclick="mode('register')">Create account</button></div><form id="authForm" class="fields"><label id="nameField" class="hidden">Name<input id="authName"></label><label id="phoneField" class="hidden">Phone<input id="authPhone"></label><label>Email<input id="authEmail" type="email" required></label><label>Password<input id="authPassword" type="password" minlength="8" required></label><div class="full"><button id="authSubmit">Sign in</button><div id="authMessage"></div></div></form></div><div id="signedIn" class="hidden"><p id="welcome"></p><button onclick="logout()">Sign out</button><div id="appointments" class="appointments"></div></div></div></section></main><footer>Fresh Cuts. Easy Booking. · Breezy Cuts</footer><script>
let catalog,authMode='login'; const $=id=>document.getElementById(id); const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(c/100); const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); const message=(el,text,error=false)=>{el.textContent=text||'';el.className=text?'notice '+(error?'error':''):''};
async function api(path,options){const response=await fetch(path,{headers:{'Content-Type':'application/json'},...options});const data=await response.json();if(!response.ok)throw new Error(data.error||'Request failed');return data}
async function load(){catalog=await api('/api/catalog');$('services').innerHTML=catalog.services.map(s=>'<article class="card"><small>'+esc(s.category)+'</small><h3>'+esc(s.name)+'</h3><p>'+esc(s.description)+'</p><span>'+esc(s.durationMinutes)+' min</span> · <span class="price">'+esc(money(s.priceCents))+'</span></article>').join('');$('service').innerHTML=catalog.services.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+' · '+esc(money(s.priceCents))+'</option>').join('');$('barber').innerHTML=catalog.barbers.map(b=>'<option value="'+esc(b.id)+'">'+esc(b.name)+'</option>').join('');const tomorrow=new Date(Date.now()+86400000);$('date').min=tomorrow.toISOString().slice(0,10);$('date').value=tomorrow.toISOString().slice(0,10);const me=await api('/api/me');showUser(me.user)}
function mode(value){authMode=value;const register=value==='register';$('nameField').classList.toggle('hidden',!register);$('phoneField').classList.toggle('hidden',!register);$('authSubmit').textContent=register?'Create account':'Sign in'}
$('bookingForm').onsubmit=async e=>{e.preventDefault();message($('bookingMessage'),'Booking…');try{const startTime=new Date($('date').value+'T'+$('time').value+':00').toISOString();const data=await api('/api/bookings',{method:'POST',body:JSON.stringify({serviceId:$('service').value,barberId:$('barber').value,startTime,customerName:$('name').value,customerEmail:$('email').value,customerPhone:$('phone').value,notes:$('notes').value})});message($('bookingMessage'),'Confirmed! Your booking code is <b>'+data.id.slice(0,8).toUpperCase()+'</b>.');await refreshBookings()}catch(error){message($('bookingMessage'),error.message,true)}};
$('authForm').onsubmit=async e=>{e.preventDefault();message($('authMessage'),'One moment…');try{const data=await api('/api/auth/'+authMode,{method:'POST',body:JSON.stringify({name:$('authName').value,phone:$('authPhone').value,email:$('authEmail').value,password:$('authPassword').value})});message($('authMessage'),'');showUser(data.user)}catch(error){message($('authMessage'),error.message,true)}};
async function showUser(user){$('signedOut').classList.toggle('hidden',!!user);$('signedIn').classList.toggle('hidden',!user);if(user){$('welcome').textContent='Welcome, '+user.name+'.';$('name').value=user.name;$('email').value=user.email;await refreshBookings()}}
async function refreshBookings(){try{const data=await api('/api/bookings');$('appointments').innerHTML=data.bookings.length?data.bookings.map(b=>'<div class="appointment"><b>'+esc(b.serviceName)+'</b> with '+esc(b.barberName)+'<br>'+esc(new Date(b.startTime).toLocaleString())+' · '+esc(b.status)+'</div>').join(''):'<p>No appointments yet.</p>'}catch{}}
async function logout(){await api('/api/auth/logout',{method:'POST'});showUser(null)} load().catch(error=>message($('bookingMessage'),error.message,true));if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
</script></body></html>`;
