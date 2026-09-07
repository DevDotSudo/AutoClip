import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({children}:{children:React.ReactNode}){
  const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:credits}=await supabase.from("credit_ledger").select("delta_minutes").eq("user_id",user.id);
  const remaining=(credits||[]).reduce((sum,row)=>sum+Number(row.delta_minutes||0),0);
  return <AppShell email={user.email||"creator"} remainingMinutes={remaining}>{children}</AppShell>;
}
