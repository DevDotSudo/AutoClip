import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createDownloadUrl } from "@/lib/r2";
import { PaymentProofForm } from "@/components/billing/payment-proof-form";
import { effectivePaymentStatus, paymentStatusLabel } from "@/lib/billing/format";

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect(`/login?next=/payment/${id}`);
  const [{ data: payment }, { data: methods }] = await Promise.all([supabase.from("payment_requests").select("id,order_number,plan_code,amount_php,currency,status,expires_at,rejection_reason").eq("id", id).eq("user_id", user.id).maybeSingle(),supabase.from("payment_methods").select("id,code,name,description,account_name,account_number,bank_name,instructions,qr_image_key").eq("enabled", true).order("sort_order")]);
  if (!payment) notFound(); const status = effectivePaymentStatus(payment.status, payment.expires_at); const safeMethods = await Promise.all((methods || []).map(async (item) => ({ ...item, qrUrl: item.qr_image_key ? await createDownloadUrl(item.qr_image_key) : null })));
  return <main className="payment-flow"><div className="payment-shell"><Link href="/app/billing" className="brand"><span className="brand-mark">A</span><span>AutoClip</span></Link><div className="payment-heading"><div><div className="section-kicker">MANUAL PAYMENT</div><h1>Complete your payment</h1><p>Your transfer stays under your control. AutoClip never charges you automatically.</p></div><div className="order-summary"><small>{payment.plan_code} PLAN</small><b>₱{Number(payment.amount_php).toLocaleString()}</b><span>30 days access</span><span>{payment.order_number}</span></div></div>{status === "AWAITING_PAYMENT" ? <PaymentProofForm paymentId={payment.id} orderNumber={payment.order_number} amount={Number(payment.amount_php)} methods={safeMethods} /> : <div className="payment-card"><span className={`status ${status.toLowerCase()}`}>{paymentStatusLabel[status] || status}</span><h2>{status === "REJECTED" ? "Payment rejected" : "Payment already submitted"}</h2><p>{payment.rejection_reason || "You can track this payment from your billing dashboard."}</p><Link href="/app/billing" className="btn btn-primary">Open billing</Link></div>}</div></main>;
}
