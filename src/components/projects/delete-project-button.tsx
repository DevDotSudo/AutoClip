"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!window.confirm("Delete this project, its jobs, generated clips, and stored media? This cannot be undone.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to delete project.");
      router.replace("/app/projects"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete project."); setBusy(false); }
  }
  return <span className="delete-project-control">{error && <span className="form-error">{error}</span>}<button type="button" className={`btn btn-secondary danger-button ${compact ? "btn-compact" : ""}`} disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete project"}</button></span>;
}
