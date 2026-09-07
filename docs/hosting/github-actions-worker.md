# GitHub Actions worker (free public-repository demo)

GitHub-hosted Actions runners can process one queued AutoClip job on demand. The runner is temporary; its local video files disappear when the workflow ends. R2 remains the persistent storage for source assets and generated clips.

## Repository requirements

- The repository must be public for GitHub-hosted free minutes.
- Add `.env.local` to `.gitignore`; never commit service-role, R2, or Gemini secrets.
- The workflow is `.github/workflows/autoclip-worker.yml`.

## GitHub secrets

In **Settings → Secrets and variables → Actions**, add:

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `GEMINI_API_KEY`.


## Application variables

Set these server-side in the Next.js app (not in browser-exposed variables):

```env
GITHUB_ACTIONS_TOKEN=your-fine-grained-token
GITHUB_REPOSITORY=owner/repository
GITHUB_ACTIONS_WORKFLOW=autoclip-worker.yml
GITHUB_ACTIONS_REF=main
```

The fine-grained token needs **Actions: Read and write** permission for the repository. When a project is created, the API dispatches the workflow. The workflow sets `WORKER_ONCE=1`, claims one queued job, and exits.

The worker accepts uploaded MP4, MOV, and WebM sources stored in R2. It does not download webpage URLs; this avoids YouTube bot checks and keeps the workflow focused on Gemini and FFmpeg processing.
