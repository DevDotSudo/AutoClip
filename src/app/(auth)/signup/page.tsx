import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return <main className="auth-shell"><section className="auth-art"><div className="auth-art-copy"><div className="section-kicker">30 FREE PROCESSING MINUTES</div><h2>Start with your next long video.</h2><p>No card required. Upload owned or licensed content, let AutoClip rank the strongest moments, then review what deserves an export.</p></div></section><section className="auth-form-wrap"><div className="auth-card"><Link href="/" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link><h1>Create your account</h1><p>Get your workspace ready in under a minute.</p><Suspense><AuthForm mode="signup" /></Suspense><div className="auth-alt">Already have an account? <Link href="/login">Log in</Link></div></div></section></main>;
}
