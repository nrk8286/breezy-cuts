import Link from "next/link";
import { Scissors } from "lucide-react";
import { currentUser } from "@/lib/dal";

export async function SiteHeader() {
  const user = await currentUser();
  return <header className="site-header"><div className="site-container nav-inner">
    <Link href="/" className="brand"><span className="brand-mark"><Scissors size={19} /></span><span>BREEZY <b>CUTS</b></span></Link>
    <nav><Link href="/#services">Services</Link><Link href="/#team">Barbers</Link><Link href="/#visit">Visit</Link></nav>
    <div className="nav-actions">{user ? <Link className="nav-login" href="/dashboard">Hi, {user.name.split(" ")[0]}</Link> : <Link className="nav-login" href="/login">Sign in</Link>}<Link className="button button-small button-primary" href="/book">Book now</Link></div>
  </div></header>;
}
