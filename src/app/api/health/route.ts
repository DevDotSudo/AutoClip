import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({ok:true,service:"autoclip-web",time:new Date().toISOString()})}
