import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminActor } from "@/lib/billing/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUploadUrl } from "@/lib/r2";

const schema=z.object({contentType:z.enum(["image/jpeg","image/png","image/webp"]),sizeBytes:z.number().int().positive().max(5*1024*1024)});const extensions:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const actor=await getAdminActor();if(!actor)return NextResponse.json({error:"Administrator access required."},{status:403});const{id}=await context.params;const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"QR image must be JPG, PNG, or WEBP up to 5 MB."},{status:400});const{data:method}=await createAdminClient().from("payment_methods").select("id").eq("id",id).maybeSingle();if(!method)return NextResponse.json({error:"Payment method not found."},{status:404});const key=`payment-methods/${id}/qr-${crypto.randomUUID()}.${extensions[parsed.data.contentType]}`;return NextResponse.json({key,uploadUrl:await createUploadUrl(key,parsed.data.contentType)});}catch(error){console.error(error);return NextResponse.json({error:"Unable to prepare QR upload."},{status:500})}}
