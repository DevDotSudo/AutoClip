import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDownloadUrl, createUploadUrl } from "@/lib/r2";

const uploadSchema = z.object({ contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.number().int().positive().max(5 * 1024 * 1024) });
const extension: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const parsed = uploadSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Receipt must be a JPG, PNG, or WEBP image up to 5 MB." }, { status: 400 });
    const admin = createAdminClient();
    const { data: payment } = await admin.from("payment_requests").select("id,user_id,status,expires_at").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!payment) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    if (payment.status !== "AWAITING_PAYMENT" || new Date(payment.expires_at) <= new Date()) return NextResponse.json({ error: "This payment request is no longer open." }, { status: 409 });
    const key = `payment-receipts/${user.id}/${id}/receipt-${crypto.randomUUID()}.${extension[parsed.data.contentType]}`;
    const { error } = await admin.from("payment_requests").update({ receipt_object_key: key, receipt_mime_type: parsed.data.contentType, receipt_size_bytes: parsed.data.sizeBytes, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).eq("status", "AWAITING_PAYMENT");
    if (error) throw error;
    return NextResponse.json({ uploadUrl: await createUploadUrl(key, parsed.data.contentType) });
  } catch (error) {
    console.error("Receipt upload preparation error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare receipt upload." }, { status: 500 });
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const admin = createAdminClient();
  const [{ data: profile }, { data: payment }] = await Promise.all([
    admin.from("profiles").select("role,status").eq("id", user.id).maybeSingle(),
    admin.from("payment_requests").select("user_id,receipt_object_key").eq("id", id).maybeSingle(),
  ]);
  if (!payment || (payment.user_id !== user.id && profile?.role !== "ADMIN")) return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  if (!payment.receipt_object_key) return NextResponse.json({ error: "No receipt uploaded." }, { status: 404 });
  return NextResponse.json({ url: await createDownloadUrl(payment.receipt_object_key) });
}
