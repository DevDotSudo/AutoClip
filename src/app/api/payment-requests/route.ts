import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ planCode: z.enum(["CREATOR", "PRO"]) });

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    const admin = createAdminClient();
    const { data: plan } = await admin.from("plans").select("code,price_php,duration_days,active").eq("code", parsed.data.planCode).maybeSingle();
    if (!plan?.active || !plan.duration_days || plan.price_php <= 0) return NextResponse.json({ error: "Plan is unavailable." }, { status: 404 });
    const { data: existing } = await admin.from("payment_requests").select("id,expires_at").eq("user_id", user.id).eq("plan_code", plan.code).eq("status", "AWAITING_PAYMENT").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ id: existing.id });
    const { data: orderNumber, error: orderError } = await admin.rpc("next_payment_order_number");
    if (orderError || !orderNumber) throw orderError || new Error("Could not create an order number.");
    const { data: payment, error } = await admin.from("payment_requests").insert({ order_number: orderNumber, user_id: user.id, plan_code: plan.code, amount_php: plan.price_php, currency: "PHP" }).select("id").single();
    if (error) throw error;
    return NextResponse.json({ id: payment.id }, { status: 201 });
  } catch (error) {
    console.error("Create payment request error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create payment request." }, { status: 500 });
  }
}
