"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const fd = new FormData(event.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const name = String(fd.get("name") || "").trim();
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(params.get("next") || "/app/dashboard"); router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) { router.replace("/app/dashboard"); router.refresh(); }
        else setMessage("Check your email to confirm your account, then log in.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed."); }
    finally { setLoading(false); }
  }

  return <form onSubmit={submit}>
    {mode === "signup" && <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" placeholder="Your name" required /></div>}
    <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></div>
    <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters" required /></div>
    {mode === "login" && <div className="auth-links"><Link href="/forgot-password">Forgot password?</Link></div>}
    {error && <div className="form-error">{error}</div>}{message && <div className="form-success">{message}</div>}
    <button className="btn btn-primary auth-submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Log in" : "Create free account"}</button>
  </form>;
}
