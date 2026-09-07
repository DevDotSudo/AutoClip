# Deployment

- Configure the public app URL, Supabase public keys, server-only Supabase service-role key, and private R2 credentials.
- Keep the R2 bucket private and allow application-origin `PUT` requests for signed uploads.
- Apply database migrations before deploying the application.
- Promote the first administrator through a trusted database session.
- Configure and enable payment destinations at `/admin/settings/payments`.
- Run the media worker on infrastructure that supports FFmpeg and long-running jobs.
