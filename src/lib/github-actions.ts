export async function dispatchWorkerRun() {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) return false;
  const workflow = process.env.GITHUB_ACTIONS_WORKFLOW || "autoclip-worker.yml";
  const ref = process.env.GITHUB_ACTIONS_REF || "main";
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref }),
  });
  if (!response.ok) throw new Error(`GitHub Actions dispatch failed (${response.status}): ${(await response.text()).slice(0, 500)}`);
  return true;
}
