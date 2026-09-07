"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "url" | "upload";

export function NewProjectForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("url");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setProgress(0);
    const fd = new FormData(event.currentTarget);
    const title = String(fd.get("title") || "").trim();
    const language = String(fd.get("language") || "auto");
    try {
      const requestedClips = Number(fd.get("requestedClips") || 5);
      const [minClipSeconds, maxClipSeconds] = String(fd.get("clipLength") || "30-60").split("-").map(Number);
      const body: Record<string, unknown> = { title, language, sourceType: mode === "url" ? "URL" : "UPLOAD", requestedClips, minClipSeconds, maxClipSeconds };
      if (mode === "url") {
        const sourceUrl = String(fd.get("sourceUrl") || "").trim();
        if (!/^https?:\/\//i.test(sourceUrl)) throw new Error("Enter a valid http(s) video URL.");
        body.sourceUrl = sourceUrl;
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("Choose a video file first.");
        const presign = await fetch("/api/uploads/presign", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ fileName:file.name, contentType:file.type || "application/octet-stream", sizeBytes:file.size }) });
        const ps = await presign.json(); if (!presign.ok) throw new Error(ps.error || "Unable to prepare upload.");
        setProgress(25);
        const uploaded = await fetch(ps.uploadUrl, { method:"PUT", headers:{"Content-Type":file.type || "application/octet-stream"}, body:file });
        if (!uploaded.ok) throw new Error("Upload to private storage failed.");
        setProgress(75);
        const complete = await fetch("/api/uploads/complete", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ assetId:ps.assetId }) });
        const done = await complete.json(); if (!complete.ok) throw new Error(done.error || "Upload verification failed.");
        body.sourceAssetId = ps.assetId;
        setProgress(90);
      }
      const response = await fetch("/api/projects", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to create project.");
      setProgress(100); router.push(`/app/projects/${result.projectId}`); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }

  return <form className="panel form-card" onSubmit={submit}>
    <div className="segmented"><button type="button" className={mode==="url"?"active":""} onClick={()=>setMode("url")}>Paste video URL</button><button type="button" className={mode==="upload"?"active":""} onClick={()=>setMode("upload")}>Upload a video</button></div>
    <div className="field"><label>Project title</label><input name="title" placeholder="e.g. Podcast episode 48" maxLength={200} required/></div>
    {mode === "url" ? <div className="field"><label>Video URL</label><input name="sourceUrl" type="url" placeholder="https://…" required/><small>Only submit content you own or have permission to repurpose. URL ingestion must follow the source platform terms.</small></div> : <div className="field"><label>Video file</label><input ref={fileRef} name="file" type="file" accept="video/mp4,video/quicktime,video/webm" required/><small>MP4, MOV, or WebM. The browser uploads directly to private R2 using a short-lived URL.</small></div>}
    <div className="field"><label>Language</label><select name="language" defaultValue="auto"><option value="auto">Auto detect</option><option value="en">English</option><option value="fil">Filipino</option></select></div>
    <div className="field"><label>Clip length</label><select name="clipLength" defaultValue="30-60"><option value="20-40">20–40 seconds</option><option value="30-60">30–60 seconds</option><option value="45-90">45–90 seconds</option></select></div>
    <div className="field"><label>Requested clips</label><select name="requestedClips" defaultValue="5"><option value="3">3 clips</option><option value="5">5 clips</option><option value="10">10 clips</option></select></div>
    {progress > 0 && <div className="field"><small>Upload/setup progress: {progress}%</small><div className="meter"><i style={{width:`${progress}%`}}/></div></div>}
    {error && <div className="form-error">{error}</div>}
    <button className="btn btn-primary" disabled={busy}>{busy ? "Preparing project…" : "Create project →"}</button>
  </form>;
}
