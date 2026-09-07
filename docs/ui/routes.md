# Routes

Customer billing:

- `/app/billing`
- `/payment/[id]`
- `/payment/submitted`
- `POST /api/payment-requests`
- `POST /api/payment-requests/[id]/receipt`
- `GET /api/payment-requests/[id]/receipt`
- `POST /api/payment-requests/[id]/submit`

Administrator billing:

- `/admin`
- `/admin/payments`
- `/admin/payments/[id]`
- `/admin/settings/payments`
- `POST /api/admin/payments/[id]/approve`
- `POST /api/admin/payments/[id]/reject`
- `PATCH /api/admin/payment-methods/[id]`
- `POST /api/admin/payment-methods/[id]/qr`
