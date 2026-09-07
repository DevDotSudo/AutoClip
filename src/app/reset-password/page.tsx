"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage(){const router=useRouter();const [error,setError]=useState("");async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const fd=new FormData(e.currentTarget);const password=String(fd.get("password")||"");try{const s=createClient();const {error}=await s.auth.updateUser({password});if(error)throw error;router.replace("/app/dashboard");}catch(err){setError(err instanceof Error?err.message:"Unable to update password.");}}return <main className="payment-page"><div className="auth-card"><h1>Choose a new password</h1><p>Use at least 8 characters.</p><form onSubmit={submit}><div className="field"><label>New password</label><input name="password" type="password" minLength={8} required/></div>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary auth-submit">Update password</button></form></div></main>}
