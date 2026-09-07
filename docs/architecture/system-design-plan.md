# Manual billing design

- `plans` is the source of truth for price, duration, limits, and credit grants.
- `payment_methods` stores administrator-configured manual destinations.
- `payment_requests` stores an immutable order amount, proof metadata, and review state.
- Order numbers use a PostgreSQL sequence and creation year.
- Open requests are treated as expired whenever `expires_at <= now()`, even before cleanup.
- Receipt objects use `payment-receipts/{userId}/{paymentRequestId}/...` and short-lived signed URLs.
- Only service-role calls to the approval and rejection functions may review payments.
- Approval locks the row and accepts only `PENDING`, preventing two administrators from granting credits twice.
- Same-plan renewals extend from the later of the existing expiry and now. Plan changes start immediately without proration.
- The media worker uploads source videos through Gemini's Files API, waits for the file to become active, asks Gemini for timestamped JSON candidates, then renders selected ranges with FFmpeg.
