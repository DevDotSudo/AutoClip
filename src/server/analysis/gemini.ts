import { z } from "zod";
import { requireEnv } from "@/lib/env";
import type { ClipCandidate } from "./clip-potential";

export type TranscriptSegment = { startMs: number; endMs: number; text: string };

const candidateSchema = z.object({
  start_ms: z.number().int().nonnegative(),
  end_ms: z.number().int().positive(),
  title: z.string().min(1).max(300),
  opening_hook: z.string().max(500).optional().default(""),
  reason: z.string().max(1000).optional().default(""),
  hook_score: z.number().min(0).max(100),
  clarity_score: z.number().min(0).max(100),
  payoff_score: z.number().min(0).max(100),
  emotion_score: z.number().min(0).max(100),
  novelty_score: z.number().min(0).max(100),
  clean_cut_score: z.number().min(0).max(100),
}).refine((c) => c.end_ms > c.start_ms, { message: "Candidate end must be after start." });

const resultSchema = z.object({ candidates: z.array(candidateSchema) });

export async function analyzeTranscriptWithGemini(args: {
  segments: TranscriptSegment[];
  minSeconds: number;
  maxSeconds: number;
  candidateCount: number;
}): Promise<ClipCandidate[]> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = [
    `Select up to ${args.candidateCount} strong short-form clip candidates lasting ${args.minSeconds}-${args.maxSeconds} seconds.`,
    "Use only timestamps and statements present in the transcript. Favor self-contained ideas with strong openings and clear payoff.",
    "Do not treat the score as a probability of virality.",
    JSON.stringify({ segments: args.segments }),
  ].join("\n\n");

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "Return valid structured JSON only. Never invent timestamps, quotes, or unsupported claims." }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          required: ["candidates"],
          properties: {
            candidates: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                required: ["start_ms","end_ms","title","hook_score","clarity_score","payoff_score","emotion_score","novelty_score","clean_cut_score"],
                properties: {
                  start_ms: { type: "INTEGER" }, end_ms: { type: "INTEGER" }, title: { type: "STRING" },
                  opening_hook: { type: "STRING" }, reason: { type: "STRING" },
                  hook_score: { type: "NUMBER" }, clarity_score: { type: "NUMBER" }, payoff_score: { type: "NUMBER" },
                  emotion_score: { type: "NUMBER" }, novelty_score: { type: "NUMBER" }, clean_cut_score: { type: "NUMBER" },
                },
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API ${response.status}: ${await response.text()}`);
  const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  if (!text) throw new Error("Gemini returned no structured content.");
  const parsed = resultSchema.parse(JSON.parse(text));
  return parsed.candidates.map((c) => ({
    startMs: c.start_ms,
    endMs: c.end_ms,
    title: c.title,
    openingHook: c.opening_hook,
    reason: c.reason,
    scores: {
      hook: c.hook_score, clarity: c.clarity_score, payoff: c.payoff_score,
      emotion: c.emotion_score, novelty: c.novelty_score, cleanCut: c.clean_cut_score,
    },
  }));
}
