# AutoClip engineering guide

The Next.js application owns public, authenticated, billing, and admin interfaces. Supabase provides authentication, PostgreSQL, row-level security, transactional entitlements, and credit history. Cloudflare R2 privately stores video assets, generated clips, and payment receipts. A separate worker handles transcription, analysis, and FFmpeg rendering.

Billing is manual: a customer submits transfer proof, an administrator verifies it, and only the database approval transaction may activate access or grant credits. The media worker uses the Gemini Files API for video understanding, then FFmpeg for clip rendering.
