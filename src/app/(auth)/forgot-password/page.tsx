"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [message,setMessage]=useState(""); const [error,setError]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError("");const fd=new FormData(e.currentTarget);const email=String(fd.get("email")||"");try{const s=createClient();const {error}=await s.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/reset-password`});if(error)throw error;setMessage("Password reset email sent.");}catch(err){setError(err instanceof Error?err.message:"Unable to send reset email.");}}
  return <main className="auth-shell"><section className="auth-art"><div className="auth-art-copy"><h2>Reset access securely.</h2><p>We will send a Supabase password-reset link to your verified email address.</p></div></section><section className="auth-form-wrap"><div className="auth-card"><Link href="/" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link><h1>Forgot password</h1><p>Enter the email attached to your account.</p><form onSubmit={submit}><div className="field"><label>Email</label><input name="email" type="email" required/></div>{error&&<div className="form-error">{error}</div>}{message&&<div className="form-success">{message}</div>}<button className="btn btn-primary auth-submit">Send reset link</button></form><div className="auth-alt"><Link href="/login">Back to login</Link></div></div></section></main>;
}
