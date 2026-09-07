import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectObject } from "@/lib/r2";

const schema = z.object({ paymentMethodId: z.string().uuid(), referenceNumber: z.string().trim().min(4).max(100), userNote: z.string().trim().max(500).optional() });
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid reference number, payment method, and note." }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const admin = createAdminClient();
    const [{ data: payment }, { data: method }] = await Promise.all([
      admin.from("payment_requests").select("id,user_id,status,expires_at,receipt_object_key,receipt_mime_type,receipt_size_bytes").eq("id", id).eq("user_id", user.id).maybeSingle(),
      admin.from("payment_methods").select("id,enabled,code").eq("id", parsed.data.paymentMethodId).eq("enabled", true).maybeSingle(),
    ]);
    if (!payment) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    if (!method) return NextResponse.json({ error: "Payment method is unavailable." }, { status: 400 });
    if (payment.status !== "AWAITING_PAYMENT" || new Date(payment.expires_at) <= new Date()) return NextResponse.json({ error: "This payment request is no longer open." }, { status: 409 });
    if (!payment.receipt_object_key || !payment.receipt_mime_type || !payment.receipt_size_bytes) return NextResponse.json({ error: "Upload a payment receipt first." }, { status: 400 });
    const head = await inspectObject(payment.receipt_object_key);
    if (!allowedTypes.has(head.ContentType || "") || Number(head.ContentLength || 0) !== Number(payment.receipt_size_bytes) || Number(head.ContentLength || 0) > 5 * 1024 * 1024) return NextResponse.json({ error: "The uploaded receipt could not be validated." }, { status: 400 });
    const { data: duplicate } = await admin.from("payment_requests").select("id").eq("payment_method_id", method.id).eq("reference_number", parsed.data.referenceNumber).in("status", ["PENDING", "APPROVED"]).neq("id", id).limit(1).maybeSingle();
    if (duplicate) return NextResponse.json({ error: "This reference number has already been submitted. Please verify your transaction details or contact support." }, { status: 409 });
    const { data: updated, error } = await admin.from("payment_requests").update({ payment_method_id: method.id, reference_number: parsed.data.referenceNumber, user_note: parsed.data.userNote || null, status: "PENDING", submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).eq("status", "AWAITING_PAYMENT").select("id").maybeSingle();
    if (error?.code === "23505") return NextResponse.json({ error: "This reference number has already been submitted. Please verify your transaction details or contact support." }, { status: 409 });
    if (error) throw error;
    if (!updated) return NextResponse.json({ error: "Payment request changed before it could be submitted." }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Submit payment error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to submit payment." }, { status: 500 });
  }
}
