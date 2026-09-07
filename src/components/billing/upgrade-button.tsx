"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function UpgradeButton({ planCode, current=false }: { planCode: "CREATOR" | "PRO"; current?: boolean }) {
  const router=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function startPayment(){setBusy(true);setError("");try{const res=await fetch("/api/payment-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({planCode})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Unable to create payment request.");router.push(`/payment/${data.id}`);}catch(e){setError(e instanceof Error?e.message:"Payment request failed.");setBusy(false);}}
  return <>{error&&<div className="form-error">{error}</div>}<button className="btn btn-primary" style={{width:"100%"}} disabled={busy} onClick={startPayment}>{busy?"Preparing payment…":current?`Renew ${planCode.toLowerCase()}`:`Choose ${planCode.toLowerCase()}`} →</button></>;
}
