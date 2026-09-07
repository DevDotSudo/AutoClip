"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  ["/app/dashboard","Dashboard","⌂"],["/app/new","New project","＋"],["/app/projects","Projects","▣"],["/app/jobs","Processing","◌"],["/app/library","Clip library","▶"],["/app/billing","Billing","₱"],["/app/settings","Settings","⚙"],["/app/help","Help","?"],
] as const;

export function AppShell({ children, email, remainingMinutes }: { children: React.ReactNode; email: string; remainingMinutes: number }) {
  const pathname=usePathname(); const router=useRouter();
  async function logout(){const s=createClient();await s.auth.signOut();router.replace("/");router.refresh();}
  return <div className="app-root"><aside className="sidebar"><div className="sidebar-top"><Link href="/app/dashboard" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link></div><Link href="/app/new" className="btn btn-primary sidebar-new">＋ New project</Link><nav className="side-nav">{links.map(([href,label,icon])=><Link key={href} href={href} className={`side-link ${pathname===href||pathname.startsWith(href+"/")?"active":""}`}><span className="side-icon">{icon}</span><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{email.slice(0,1).toUpperCase()}</div><div><b>{email.split("@")[0]}</b><span>{email}</span></div></div><button className="btn btn-ghost" style={{width:"100%"}} onClick={logout}>Log out</button></div></aside><main className="app-main"><header className="app-topbar"><span className="topbar-title">Creator workspace</span><div className="topbar-actions"><span className="minutes-pill">{remainingMinutes.toLocaleString()} minutes available</span><ThemeToggle/></div></header><div className="app-content">{children}</div></main></div>;
}
