# AutoClip — Next.js + Supabase

AutoClip turns long-form video into ranked short clips. It uses Next.js, React, TypeScript, Supabase, private Cloudflare R2 storage, Gemini, and FFmpeg.

## Billing

Creator and Pro are renewable 30-day access passes paid by manual transfer. Customers create an order, choose an enabled payment method, submit a transaction reference and private receipt, then wait for administrator review. No third-party payment gateway, payment API, recurring debit, or automatic charge is used.

Approval is an idempotent PostgreSQL transaction: it locks the pending payment, activates or extends access, grants plan minutes once, and writes an audit entry. Receipt files remain private in R2 and are viewed through short-lived signed URLs.

## Local setup

1. Copy `.env.example` to `.env.local` and provide Supabase and R2 credentials.
2. Apply `supabase/migrations/202609070001_init.sql`.
3. Make the first administrator by setting their `profiles.role` to `ADMIN` from a trusted SQL session.
4. Open `/admin/settings/payments`, add the real account details, and enable the desired methods.
5. Run `npm install` and `npm run dev`.

For video generation, keep the web app running and start the long-lived Gemini worker in a second terminal:

```powershell
$env:TRANSCRIPTION_PROVIDER="gemini"
npm run worker:dev
```

The worker uses `GEMINI_API_KEY` to analyze uploaded videos stored in private R2, then uses the configured `FFMPEG_PATH` to render clips. New projects require an uploaded MP4, MOV, or WebM source; webpage URL ingestion is intentionally disabled so processing does not depend on YouTube downloaders or bot checks.

Keep the service-role and R2 secret keys server-only. Configure R2 CORS to allow authenticated browser `PUT` uploads from the application origin, and never make the receipt prefix public.

For a remote worker deployment, see [the Google Cloud VM guide](docs/hosting/google-cloud-worker.md). The included `Dockerfile.worker` installs FFmpeg and keeps the processing process running independently from the web app.

For a no-billing demo using a public GitHub repository, the optional [GitHub Actions worker](docs/hosting/github-actions-worker.md) runs one queued job on a temporary hosted runner per workflow dispatch.
