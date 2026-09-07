import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function LoginPage() {
  return <main className="auth-shell"><section className="auth-art"><div className="auth-art-copy"><div className="section-kicker">AUTOCLIP</div><h2>Find the moments worth turning into shorts.</h2><p>Transcript-first analysis, ranked clip candidates, vertical exports, and a durable media pipeline.</p></div></section><section className="auth-form-wrap"><div className="auth-card"><Link href="/" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link><h1>Welcome back</h1><p>Log in to your creator workspace.</p><Suspense><AuthForm mode="login" /></Suspense><div className="auth-alt">New to AutoClip? <Link href="/signup">Create an account</Link></div></div></section></main>;
}
