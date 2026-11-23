/** Who may do what with a client's monthly payment. No runtime imports on purpose. */

export type BillingProfile = {
  role: string | null | undefined;
  access?: string | null;
  permissions?: readonly string[] | null;
  tenantId?: string | null;
};

/**
 * May this signed-in person set up the monthly payment for their own account?
 * Only a client login can, and only an account admin or someone given Billing.
 * ASC staff use a payment link instead, so they never pay on a client's behalf.
 */
export function canStartPayment(p: BillingProfile): boolean {
  if (p.role !== "client" || !p.tenantId) return false;
  return p.access === "admin" || (p.permissions ?? []).includes("billing");
}

export const LINK_DAYS = 7;

export function linkExpiry(now: Date): Date {
  return new Date(now.getTime() + LINK_DAYS * 86_400_000);
}

export function linkIsUsable(row: { expiresAt: string } | null | undefined, now: Date): boolean {
  return Boolean(row) && Date.parse(row!.expiresAt) > now.getTime();
}
