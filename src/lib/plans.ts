export type PlanCode = "FREE" | "CREATOR" | "PRO";

export const PLAN_COPY: Record<PlanCode, { tagline: string; features: string[] }> = {
  FREE: {
    tagline: "Try the full workflow with a small monthly allowance.",
    features: ["30 processing minutes", "3 clips per project", "720p export", "Basic captions", "AutoClip watermark"],
  },
  CREATOR: {
    tagline: "For creators publishing consistently every week.",
    features: ["500 processing minutes", "15 clips per project", "1080p export", "Caption presets", "No watermark"],
  },
  PRO: {
    tagline: "Higher volume, priority processing, and larger projects.",
    features: ["1,200 processing minutes", "30 clips per project", "240-minute sources", "Priority queue", "No watermark"],
  },
};
