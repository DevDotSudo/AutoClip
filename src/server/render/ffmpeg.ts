import path from "node:path";

export type RenderRequest = {
  input: string;
  output: string;
  startMs: number;
  endMs: number;
  aspectRatio: "ORIGINAL" | "VERTICAL" | "SQUARE" | "LANDSCAPE";
  resolution: "720p" | "1080p";
  subtitles?: string | null;
};

function seconds(ms: number) { return (ms / 1000).toFixed(3); }
function safeFilterPath(file: string) {
  const value = path.resolve(file).replaceAll("\\", "/");
  if (value.includes("'") || value.includes("\n") || value.includes("\r")) throw new Error("Unsafe subtitle path.");
  return value.replace(":", "\\:");
}

export function createFfmpegArgs(request: RenderRequest) {
  if (request.endMs <= request.startMs) throw new Error("Invalid clip range.");
  const verticalWidth = request.resolution === "1080p" ? 1080 : 720;
  const verticalHeight = request.resolution === "1080p" ? 1920 : 1280;
  const targetSize = request.resolution === "1080p" ? 1080 : 720;
  let filter = request.aspectRatio === "ORIGINAL"
    ? `scale=w='if(gte(iw,ih),-2,${targetSize})':h='if(gte(iw,ih),${targetSize},-2)'`
    : request.aspectRatio === "VERTICAL"
    ? `scale=${verticalWidth}:${verticalHeight}:force_original_aspect_ratio=increase,crop=${verticalWidth}:${verticalHeight}`
    : request.aspectRatio === "SQUARE"
      ? `scale=${verticalWidth}:${verticalWidth}:force_original_aspect_ratio=increase,crop=${verticalWidth}:${verticalWidth}`
      : `scale=${verticalHeight}:${verticalWidth}:force_original_aspect_ratio=decrease,pad=${verticalHeight}:${verticalWidth}:(ow-iw)/2:(oh-ih)/2`;
  if (request.subtitles) filter += `,subtitles='${safeFilterPath(request.subtitles)}'`;

  return [
    process.env.FFMPEG_PATH || "ffmpeg", "-hide_banner", "-nostdin", "-y",
    "-ss", seconds(request.startMs), "-to", seconds(request.endMs), "-i", path.resolve(request.input),
    "-vf", filter, "-af", "loudnorm", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", path.resolve(request.output),
  ];
}
