# Cloudflare R2

Use a private bucket. The app creates short-lived presigned PUT URLs from `/api/uploads/presign` and verifies the uploaded object with `/api/uploads/complete` before marking it READY.

Recommended bucket CORS for local development and your production domain:

- Methods: `PUT`, `GET`, `HEAD`
- Allowed headers: `Content-Type`
- Origins: exact application origins only

Do not put R2 secret keys in any `NEXT_PUBLIC_*` variable.
