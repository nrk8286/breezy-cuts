import Link from "next/link";
import { Scissors } from "lucide-react";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="auth-page"><Link href="/" className="brand auth-brand"><span className="brand-mark"><Scissors size={19} /></span><span>BREEZY <b>CUTS</b></span></Link><div className="auth-layout"><section className="auth-copy"><span className="kicker">GOOD TO SEE YOU</span><h1>Your next fresh cut starts here.</h1><p>Sign in to manage appointments, rebook a favorite service, or keep the day moving.</p><div className="auth-quote"><span>“</span><p>Clean shop, easy booking, and Marcus gets it right every time.</p><b>— Darnell T.</b></div></section><AuthForm /></div></main>;
}
