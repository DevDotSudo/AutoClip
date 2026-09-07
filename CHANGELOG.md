# AutoClip changelog

## 0.3.0 — Manual billing

- Removed the hosted payment integration, redirects, callbacks, credentials, and provider-specific code.
- Added database-configured GCash, GoTyme, and bank-transfer methods.
- Added concurrency-safe order numbers, expiring payment requests, private R2 receipt uploads, and duplicate-reference checks.
- Added a protected admin payment queue, receipt review, method settings, and atomic approval/rejection transactions.
- Updated billing, landing, help, privacy, terms, deployment guidance, and route documentation.
