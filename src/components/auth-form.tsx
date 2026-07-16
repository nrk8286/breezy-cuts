"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json() as { error?: string }; setBusy(false);
    if (!response.ok) { setError(result.error || "Unable to sign in."); return; }
    router.push("/dashboard"); router.refresh();
  }
  function demo(email: string) { setMode("login"); setForm({ name: "", phone: "", email, password: "Breezy123!" }); }
  return <section className="auth-card"><div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Sign in</button><button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Create account</button></div><form onSubmit={submit}>{mode === "register" && <><label><span>Name</span><input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label><span>Phone</span><input required autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label></>}<label><span>Email</span><input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label><span>Password</span><input type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={18} /></button></form>{process.env.NODE_ENV !== "production" && <div className="demo-box"><span>Local demo access</span><div><button onClick={() => demo("customer@breezycuts.test")}>Customer</button><button onClick={() => demo("admin@breezycuts.test")}>Admin</button></div></div>}<p className="auth-note">By continuing, you agree to receive appointment-related messages. Standard rates may apply.</p></section>;
}
