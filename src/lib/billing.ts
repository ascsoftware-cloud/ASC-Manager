import { createServerFn } from "@tanstack/react-start";
import type { PaymentLinkView } from "./billing.server";
import type { PlanChoice } from "./billing-plans";

/**
 * Monthly billing through PayFast. Each function checks who is asking on the
 * server: staff-only ones need a staff login, startCheckout needs a client
 * account admin (or someone given Billing), and the payment link works from
 * its secret address alone.
 */

export type CheckoutForm = { action: string; fields: [string, string][] };
export type { PaymentLinkView };

export const setPlanFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      accessToken: string;
      tenantId: string;
      choice: PlanChoice;
      database: boolean;
      customAmountZar?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { setPlan } = await import("./billing.server");
    return setPlan(data);
  });

export const createPaymentLinkFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; tenantId: string }) => d)
  .handler(async ({ data }) => {
    const { createPaymentLink } = await import("./billing.server");
    return createPaymentLink(data);
  });

export const cancelSubscriptionFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string; tenantId: string }) => d)
  .handler(async ({ data }) => {
    const { cancelSubscription } = await import("./billing.server");
    return cancelSubscription(data);
  });

export const startCheckoutFn = createServerFn({ method: "POST" })
  .validator((d: { accessToken: string }) => d)
  .handler(async ({ data }): Promise<CheckoutForm> => {
    const { startCheckout } = await import("./billing.server");
    return startCheckout(data);
  });

export const resolvePaymentLinkFn = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }): Promise<PaymentLinkView> => {
    const { resolvePaymentLink } = await import("./billing.server");
    return resolvePaymentLink(data.token);
  });
