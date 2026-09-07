import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dispatchWorkerRun } from "@/lib/github-actions";

const schema=z.object({
  title:z.string().min(1).max(200), sourceType:z.enum(["URL","UPLOAD"]), sourceUrl:z.string().url().optional(), sourceAssetId:z.string().uuid().optional(),
  language:z.string().max(30).default("auto"), requestedClips:z.number().int().min(1).max(30).default(5), minClipSeconds:z.number().int().min(10).max(120).default(30), maxClipSeconds:z.number().int().min(15).max(180).default(60)
}).refine(v=>v.sourceType==="URL"?!!v.sourceUrl:!!v.sourceAssetId,{message:"Source is required."});

export async function POST(request:Request){try{const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message||"Invalid project."},{status:400});const v=parsed.data;const {data,error}=await s.rpc("create_project_with_job",{p_title:v.title,p_source_type:v.sourceType,p_source_url:v.sourceUrl||null,p_source_asset_id:v.sourceAssetId||null,p_language:v.language,p_requested_clips:v.requestedClips,p_min_clip_seconds:v.minClipSeconds,p_max_clip_seconds:v.maxClipSeconds});if(error)throw error;try{await dispatchWorkerRun();}catch(dispatchError){console.error("GitHub Actions worker dispatch failed",dispatchError);}return NextResponse.json({projectId:data},{status:201});}catch(e){console.error(e);return NextResponse.json({error:e instanceof Error?e.message:"Unable to create project."},{status:500})}}
