# System overview

```text
Browser → Next.js → Supabase Auth/PostgreSQL
                 ├→ private R2 media and receipts
                 └→ media worker → Gemini / FFmpeg

Billing → manual transfer → proof submitted → admin review
                                      ├→ approve → subscription + credits
                                      └→ reject  → reason shown to customer
```

Paid access requires an `ACTIVE` subscription whose `period_end` is later than the current time. Browser navigation and receipt submission never activate access. Service-role and R2 credentials are server-only.
