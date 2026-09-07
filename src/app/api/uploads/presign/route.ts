import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUploadUrl } from "@/lib/r2";

const schema=z.object({fileName:z.string().min(1).max(255),contentType:z.string().min(1).max(120),sizeBytes:z.number().positive().max(5_000_000_000)});
const allowed=new Set(["video/mp4","video/quicktime","video/webm","application/octet-stream"]);

export async function POST(request:Request){try{const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});const parsed=schema.safeParse(await request.json());if(!parsed.success||!allowed.has(parsed.data.contentType))return NextResponse.json({error:"Unsupported upload."},{status:400});const assetId=crypto.randomUUID();const extension=(parsed.data.fileName.split(".").pop()||"bin").replace(/[^a-zA-Z0-9]/g,"").slice(0,8);const key=`users/${user.id}/sources/${assetId}.${extension}`;const admin=createAdminClient();const {error}=await admin.from("media_assets").insert({id:assetId,user_id:user.id,asset_type:"SOURCE",r2_key:key,mime_type:parsed.data.contentType,size_bytes:parsed.data.sizeBytes,status:"PENDING"});if(error)throw error;const uploadUrl=await createUploadUrl(key,parsed.data.contentType);return NextResponse.json({assetId,uploadUrl,expiresIn:Number(process.env.R2_UPLOAD_TTL_SECONDS||900)});}catch(e){console.error(e);return NextResponse.json({error:e instanceof Error?e.message:"Unable to prepare upload."},{status:500})}}
