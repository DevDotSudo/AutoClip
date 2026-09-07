/**
 * Gemini video worker. Run this as a long-lived process with `npm run worker:dev`.
 * It claims durable Supabase jobs, sends private source videos to Gemini's Files
 * API, renders selected ranges with FFmpeg, and writes private clips back to R2.
 */
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { downloadObjectToFile, uploadFile, uploadObject } from "../lib/r2";
import { createFfmpegArgs } from "../server/render/ffmpeg";
import { clipPotential, selectCandidates, type ClipCandidate } from "../server/analysis/clip-potential";
import { analyzeVideoWithGemini, deleteGeminiFile, uploadVideoToGemini, waitForGeminiFile } from "../server/analysis/gemini-video";

loadEnvConfig(process.cwd());

const execFileAsync = promisify(execFile);
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Worker requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const workerId = `worker-${process.pid}-${randomUUID().slice(0, 6)}`;
const interval = Number(process.env.JOB_POLL_INTERVAL_MS || 2000);

type Job = { id: string; project_id: string; user_id: string; stage: string; state: string; progress: number; attempt_count: number; requested_clips: number; min_clip_seconds: number | null; max_clip_seconds: number | null; aspect_ratio: string };

async function setJob(id: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("processing_jobs").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

async function setProject(id: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("projects").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

async function retainSourceAsset(projectId: string, userId: string, filePath: string, mimeType: string) {
  const sourceKey = `users/${userId}/sources/${projectId}.source`;
  const { data: existing, error: lookupError } = await supabase.from("media_assets").select("id").eq("project_id", projectId).eq("asset_type", "SOURCE").maybeSingle();
  if (lookupError) throw lookupError;
  await uploadFile(sourceKey, filePath, mimeType);
  const assetId = existing?.id || randomUUID();
  const assetValues = { user_id: userId, project_id: projectId, asset_type: "SOURCE", r2_key: sourceKey, mime_type: mimeType, size_bytes: (await stat(filePath)).size, status: "READY" };
  const { error: assetError } = existing
    ? await supabase.from("media_assets").update({ ...assetValues, updated_at: new Date().toISOString() }).eq("id", assetId)
    : await supabase.from("media_assets").insert({ id: assetId, ...assetValues });
  if (assetError) throw assetError;
  await setProject(projectId, { source_asset_id: assetId });
}

async function probeDuration(filePath: string) {
  const { stdout } = await execFileAsync(process.env.FFPROBE_PATH || "ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", filePath], { maxBuffer: 1024 * 1024 });
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("FFprobe could not determine the source duration.");
  return Math.round(seconds * 1000);
}

async function downloadSource(project: { source_type: string; source_url: string | null; source_asset_id: string | null }, filePath: string) {
  if (project.source_asset_id) {
    const { data: asset, error } = await supabase.from("media_assets").select("r2_key,mime_type,status").eq("id", project.source_asset_id).maybeSingle();
    if (error) throw error;
    if (!asset || asset.status !== "READY") throw new Error("The uploaded source is not ready.");
    await downloadObjectToFile(asset.r2_key, filePath);
    return asset.mime_type || "video/mp4";
  }
  if (!project.source_url) throw new Error("This project has no source video.");
  if (!/^https?:\/\//i.test(project.source_url)) throw new Error("Only http(s) video URLs are supported.");
  const response = await fetch(project.source_url);
  const contentType = response.headers.get("content-type") || "";
  if (response.ok && contentType.startsWith("video/")) {
    if (!response.body) throw new Error("The direct video URL returned an empty response.");
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(filePath));
    return contentType.split(";")[0] || "video/mp4";
  }

  // Page URLs (including YouTube) need an external downloader. Keep this as a
  // subprocess with argument arrays so the user URL is never shell-interpreted.
  try {
    const downloaderArgs = ["--no-playlist", "--format", "bv*+ba/b", "--merge-output-format", "mp4"];
    if (process.env.YTDLP_FORCE_IPV4 === "1") downloaderArgs.push("--force-ipv4");
    if (process.env.YTDLP_COOKIES_FILE) downloaderArgs.push("--cookies", process.env.YTDLP_COOKIES_FILE);
    if (process.env.YTDLP_COOKIES_FROM_BROWSER) downloaderArgs.push("--cookies-from-browser", process.env.YTDLP_COOKIES_FROM_BROWSER);
    downloaderArgs.push("--output", filePath, project.source_url);
    await execFileAsync(process.env.YTDLP_PATH || "yt-dlp", downloaderArgs, { maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") throw new Error("This URL is a webpage rather than a direct video. Install yt-dlp and set YTDLP_PATH, or upload the video file instead.");
    throw new Error(`Video URL download failed: ${error instanceof Error ? error.message : "yt-dlp failed"}. If YouTube returned 403, update yt-dlp and configure YTDLP_COOKIES_FROM_BROWSER or YTDLP_COOKIES_FILE.`);
  }
  return "video/mp4";
}

async function renderClip(input: string, output: string, candidate: ClipCandidate, resolution: "720p" | "1080p") {
  const args = createFfmpegArgs({ input, output, startMs: candidate.startMs, endMs: candidate.endMs, aspectRatio: "ORIGINAL", resolution });
  await execFileAsync(args[0], args.slice(1), { maxBuffer: 10 * 1024 * 1024 });
}

async function processJob(job: Job) {
  const workDir = await mkdtemp(path.join(tmpdir(), "autoclip-"));
  let geminiFile: { name: string } | null = null;
  try {
    await setProject(job.project_id, { status: "PROCESSING" });
    await setJob(job.id, { state: "RUNNING", stage: "INGEST", progress: 5, error_code: null, error_message: null });
    const { data: project, error: projectError } = await supabase.from("projects").select("source_type,source_url,source_asset_id").eq("id", job.project_id).eq("user_id", job.user_id).single();
    if (projectError) throw projectError;
    const sourcePath = path.join(workDir, "source");
    const mimeType = await downloadSource(project, sourcePath);
    const durationMs = await probeDuration(sourcePath);
    await setProject(job.project_id, { duration_ms: durationMs });
    if (!project.source_asset_id) await retainSourceAsset(job.project_id, job.user_id, sourcePath, mimeType);
    await setJob(job.id, { stage: "TRANSCRIBE", progress: 15 });

    const uploaded = await uploadVideoToGemini(sourcePath, mimeType, `autoclip-${job.project_id}`);
    geminiFile = uploaded;
    await setJob(job.id, { stage: "TRANSCRIBE", progress: 25 });
    const readyFile = await waitForGeminiFile(uploaded);
    await setJob(job.id, { stage: "ANALYZE", progress: 40 });
    const candidates = await analyzeVideoWithGemini(readyFile, { minSeconds: job.min_clip_seconds || 20, maxSeconds: job.max_clip_seconds || 60, candidateCount: job.requested_clips, durationMs });
    const selected = selectCandidates(candidates, job.requested_clips, durationMs);
    if (!selected.length) throw new Error("Gemini did not return a valid clip candidate for this video.");
    await supabase.from("transcripts").insert({ project_id: job.project_id, job_id: job.id, provider: "gemini-video", language: null, raw_text: null, segments_json: [] });
    const candidateRows = candidates.map((candidate) => ({ project_id: job.project_id, job_id: job.id, start_ms: candidate.startMs, end_ms: candidate.endMs, title: candidate.title, opening_hook: candidate.openingHook || null, reason: candidate.reason || null, hook_score: Math.round(candidate.scores.hook), clarity_score: Math.round(candidate.scores.clarity), payoff_score: Math.round(candidate.scores.payoff), emotion_score: Math.round(candidate.scores.emotion), novelty_score: Math.round(candidate.scores.novelty), clean_cut_score: Math.round(candidate.scores.cleanCut), clip_potential: clipPotential(candidate.scores), selected: selected.includes(candidate) }));
    const { data: insertedCandidates, error: candidateError } = await supabase.from("clip_candidates").insert(candidateRows).select("id,start_ms,end_ms,title,clip_potential");
    if (candidateError || !insertedCandidates) throw candidateError || new Error("Could not save Gemini candidates.");
    await setJob(job.id, { stage: "RENDER", progress: 55 });

    const { data: subscription } = await supabase.from("subscriptions").select("plan_code").eq("user_id", job.user_id).eq("status", "ACTIVE").gt("period_end", new Date().toISOString()).order("period_end", { ascending: false }).limit(1).maybeSingle();
    const { data: plan } = await supabase.from("plans").select("max_resolution").eq("code", subscription?.plan_code || "FREE").maybeSingle();
    const resolution = plan?.max_resolution === "1080p" ? "1080p" : "720p";
    const selectedRows = insertedCandidates.filter((row) => selected.some((candidate) => candidate.startMs === row.start_ms && candidate.endMs === row.end_ms));
    for (let index = 0; index < selectedRows.length; index += 1) {
      const row = selectedRows[index];
      const candidate = selected.find((item) => item.startMs === row.start_ms && item.endMs === row.end_ms);
      if (!candidate) continue;
      const { data: clip, error: clipError } = await supabase.from("clips").insert({ project_id: job.project_id, job_id: job.id, candidate_id: row.id, user_id: job.user_id, title: row.title, start_ms: row.start_ms, end_ms: row.end_ms, clip_potential: row.clip_potential, status: "PROCESSING" }).select("id").single();
      if (clipError || !clip) throw clipError || new Error("Could not create clip record.");
      const outputPath = path.join(workDir, `${clip.id}.mp4`);
      await renderClip(sourcePath, outputPath, candidate, resolution);
      const outputBytes = await readFile(outputPath);
      const outputKey = `users/${job.user_id}/clips/${clip.id}.mp4`;
      await uploadObject(outputKey, outputBytes, "video/mp4");
      const assetId = randomUUID();
      const { error: assetError } = await supabase.from("media_assets").insert({ id: assetId, user_id: job.user_id, project_id: job.project_id, job_id: job.id, asset_type: "CLIP", r2_key: outputKey, mime_type: "video/mp4", size_bytes: (await stat(outputPath)).size, status: "READY" });
      if (assetError) throw assetError;
      const { error: clipUpdateError } = await supabase.from("clips").update({ video_asset_id: assetId, status: "READY", updated_at: new Date().toISOString() }).eq("id", clip.id);
      if (clipUpdateError) throw clipUpdateError;
      await setJob(job.id, { stage: "RENDER", progress: 55 + Math.round(((index + 1) / selectedRows.length) * 40) });
    }
    await setJob(job.id, { state: "COMPLETED", stage: "FINALIZE", progress: 100, completed_at: new Date().toISOString(), lock_owner: null, lock_expires_at: null });
    await setProject(job.project_id, { status: "READY" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error.";
    console.error(`[AutoClip worker] job ${job.id} failed`, error);
    await setJob(job.id, { state: "FAILED", error_code: "WORKER_FAILED", error_message: message.slice(0, 1000), lock_owner: null, lock_expires_at: null });
    await setProject(job.project_id, { status: "FAILED" });
  } finally {
    if (geminiFile) await deleteGeminiFile(geminiFile.name);
    await rm(workDir, { recursive: true, force: true });
  }
}

async function tick() {
  const { data, error } = await supabase.rpc("claim_next_job", { p_worker_id: workerId, p_lock_seconds: 1800 });
  if (error) throw error;
  const job = (data?.[0] || null) as Job | null;
  if (job) await processJob(job);
}

async function main() {
  console.log(`[AutoClip worker] Gemini worker started as ${workerId}`);
  if (process.env.WORKER_ONCE === "1") {
    await tick();
    return;
  }
  for (;;) {
    try { await tick(); } catch (error) { console.error("[AutoClip worker]", error); }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

void main().catch((error) => {
  console.error("[AutoClip worker] fatal error", error);
  process.exitCode = 1;
});
