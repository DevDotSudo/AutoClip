import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObject } from "@/lib/r2";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid project." }, { status: 400 });
    const session = await createClient();
    const { data: { user } } = await session.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const admin = createAdminClient();
    const { data: project } = await admin.from("projects").select("id,user_id").eq("id", id).maybeSingle();
    if (!project || project.user_id !== user.id) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const { data: assets, error: assetsError } = await admin.from("media_assets").select("r2_key").eq("project_id", id);
    if (assetsError) throw assetsError;
    // Remove rows that reference generated media before the asset/project cascades run.
    const { error: clipsError } = await admin.from("clips").delete().eq("project_id", id);
    if (clipsError) throw clipsError;
    await admin.from("processing_jobs").update({ state: "CANCELLED", lock_owner: null, lock_expires_at: null, updated_at: new Date().toISOString() }).eq("project_id", id).in("state", ["QUEUED", "RUNNING"]);
    await Promise.all((assets || []).map((asset) => deleteObject(asset.r2_key)));
    // Clear the circular source-asset reference before cascading project assets.
    const { error: detachError } = await admin.from("projects").update({ source_asset_id: null }).eq("id", id).eq("user_id", user.id);
    if (detachError) throw detachError;
    const { error } = await admin.from("projects").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete project error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to delete project." }, { status: 500 });
  }
}
