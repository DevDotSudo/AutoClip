import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminActor } from "@/lib/billing/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const schema=z.object({note:z.string().trim().max(1000).optional()});
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const actor=await getAdminActor();if(!actor)return NextResponse.json({error:"Administrator access required."},{status:403});const {id}=await context.params;const parsed=schema.safeParse(await request.json());if(!parsed.success||!z.string().uuid().safeParse(id).success)return NextResponse.json({error:"Invalid request."},{status:400});const {error}=await createAdminClient().rpc("approve_payment_request",{p_payment_id:id,p_admin_user_id:actor.id,p_admin_note:parsed.data.note||null});if(error)return NextResponse.json({error:error.message},{status:409});return NextResponse.json({ok:true});}catch(error){console.error(error);return NextResponse.json({error:"Unable to approve payment."},{status:500})}}
