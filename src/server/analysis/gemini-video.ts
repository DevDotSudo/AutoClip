import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { requireEnv } from "@/lib/env";
import type { ClipCandidate } from "./clip-potential";

type GeminiFile = { name: string; uri: string; mimeType?: string; state?: { name?: string } };
type GeminiFileResponse = { file?: GeminiFile };

function apiUrl(path: string) {
  return `https://generativelanguage.googleapis.com${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(requireEnv("GEMINI_API_KEY"))}`;
}

async function readError(response: Response) {
  const body = await response.text();
  return `Gemini API ${response.status}: ${body.slice(0, 1200)}`;
}

export async function uploadVideoToGemini(filePath: string, mimeType: string, displayName: string) {
  const bytes = (await stat(filePath)).size;
  const start = await fetch(apiUrl("/upload/v1beta/files"), {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(bytes),
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file: { display_name: displayName.slice(0, 512) } }),
  });
  if (!start.ok) throw new Error(await readError(start));
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not return a resumable upload URL.");
  const upload = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Length": String(bytes), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "Content-Type": mimeType },
    // Node's fetch requires this flag for a streaming request body.
    duplex: "half",
    body: createReadStream(filePath),
  } as unknown as RequestInit & { duplex: "half" });
  if (!upload.ok) throw new Error(await readError(upload));
  const result = await upload.json() as GeminiFileResponse;
  if (!result.file?.name || !result.file.uri) throw new Error("Gemini returned an incomplete uploaded file.");
  return result.file;
}

export async function waitForGeminiFile(file: GeminiFile, timeoutMs = 10 * 60 * 1000) {
  const startedAt = Date.now();
  let current = file;
  while (current.state?.name === "PROCESSING") {
    if (Date.now() - startedAt > timeoutMs) throw new Error("Gemini video processing timed out.");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const response = await fetch(apiUrl(`/v1beta/${current.name}`));
    if (!response.ok) throw new Error(await readError(response));
    const result = await response.json() as GeminiFileResponse;
    if (!result.file) throw new Error("Gemini returned no file state.");
    current = result.file;
  }
  if (current.state?.name === "FAILED") throw new Error("Gemini could not process the uploaded video.");
  return current;
}

export async function deleteGeminiFile(fileName: string) {
  try { await fetch(apiUrl(`/v1beta/${fileName}`), { method: "DELETE" }); } catch { /* best effort cleanup */ }
}

const candidateShape = {
  type: "OBJECT",
  required: ["start_ms", "end_ms", "title", "opening_hook", "reason", "hook_score", "clarity_score", "payoff_score", "emotion_score", "novelty_score", "clean_cut_score"],
  properties: {
    start_ms: { type: "INTEGER" }, end_ms: { type: "INTEGER" }, title: { type: "STRING" }, opening_hook: { type: "STRING" }, reason: { type: "STRING" },
    hook_score: { type: "NUMBER" }, clarity_score: { type: "NUMBER" }, payoff_score: { type: "NUMBER" }, emotion_score: { type: "NUMBER" }, novelty_score: { type: "NUMBER" }, clean_cut_score: { type: "NUMBER" },
  },
};

export async function analyzeVideoWithGemini(file: GeminiFile, args: { minSeconds: number; maxSeconds: number; candidateCount: number; durationMs: number }): Promise<ClipCandidate[]> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = [
    `Find up to ${args.candidateCount} self-contained short-form clips lasting ${args.minSeconds}-${args.maxSeconds} seconds in this video.`,
    `The source duration is ${Math.round(args.durationMs / 1000)} seconds. Return timestamps in integer milliseconds between 0 and ${args.durationMs}.`,
    "Use the spoken audio and visuals. Favor broadly interesting, surprising, emotional, opinionated, or highly shareable moments with a strong opening hook, a complete idea, a clear payoff, and clean edit boundaries.",
    "Return only JSON matching the schema. Never invent dialogue, timestamps, or claims. Scores are editorial rankings from 0 to 100, not probabilities.",
  ].join("\n");
  const response = await fetch(apiUrl(`/v1beta/models/${encodeURIComponent(model)}:generateContent`), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ file_data: { mime_type: file.mimeType || "video/mp4", file_uri: file.uri } }, { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", required: ["candidates"], properties: { candidates: { type: "ARRAY", items: candidateShape } } } },
    }),
  });
  if (!response.ok) throw new Error(await readError(response));
  const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no video analysis.");
  const parsed = JSON.parse(text) as { candidates?: Array<Record<string, unknown>> };
  if (!Array.isArray(parsed.candidates)) throw new Error("Gemini returned an invalid candidate list.");
  return parsed.candidates.map((candidate) => ({
    startMs: Number(candidate.start_ms), endMs: Number(candidate.end_ms), title: String(candidate.title || "Untitled clip"), openingHook: String(candidate.opening_hook || ""), reason: String(candidate.reason || ""),
    scores: { hook: Number(candidate.hook_score), clarity: Number(candidate.clarity_score), payoff: Number(candidate.payoff_score), emotion: Number(candidate.emotion_score), novelty: Number(candidate.novelty_score), cleanCut: Number(candidate.clean_cut_score) },
  }));
}
