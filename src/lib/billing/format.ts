export function formatPhp(value: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: string | null | undefined) {
  return value ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export function effectivePaymentStatus(status: string, expiresAt: string) {
  return status === "AWAITING_PAYMENT" && new Date(expiresAt).getTime() <= Date.now() ? "EXPIRED" : status;
}

export const paymentStatusLabel: Record<string, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};
