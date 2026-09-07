import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminActor } from "@/lib/billing/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema=z.object({reason:z.string().trim().min(3).max(500),note:z.string().trim().max(1000).optional()});
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const actor=await getAdminActor();if(!actor)return NextResponse.json({error:"Administrator access required."},{status:403});const {id}=await context.params;const parsed=schema.safeParse(await request.json());if(!parsed.success||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"A rejection reason is required."},{status:400});const {error}=await createAdminClient().rpc("reject_payment_request",{p_payment_id:id,p_admin_user_id:actor.id,p_reason:parsed.data.reason,p_admin_note:parsed.data.note||null});if(error)return NextResponse.json({error:error.message},{status:409});return NextResponse.json({ok:true});}catch(error){console.error(error);return NextResponse.json({error:"Unable to reject payment."},{status:500})}}
