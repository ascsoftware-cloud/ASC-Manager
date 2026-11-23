/**
 * What to do when PayFast tells us about a payment (an ITN).
 *
 * A notification is only believed when ALL of these hold:
 *   1. its signature matches (so it was made with our passphrase),
 *   2. it came from a PayFast address,
 *   3. it belongs to a subscription we created,
 *   4. the amount is what we asked for, and
 *   5. PayFast confirms it when we ask them directly.
 * A notification we have already handled changes nothing. The database and the
 * PayFast call are injected so these rules can be tested without either.
 */
import {
  amountsMatch,
  confirmationBody,
  parseItn,
  verifyItnSignature,
  type Pair,
} from "./payfast.ts";

export type PlanRow = {
  id: string;
  tenantId: string;
  amountZar: number;
  status: "awaiting" | "active" | "failed" | "cancelled";
};

export type ItnStore = {
  findSubscription(id: string): Promise<PlanRow | null>;
  paymentSeen(pfPaymentId: string): Promise<boolean>;
  recordPayment(p: {
    tenantId: string;
    subscriptionId: string;
    pfPaymentId: string;
    amountZar: number;
    status: "complete" | "failed" | "cancelled";
  }): Promise<void>;
  update(
    subscriptionId: string,
    patch: {
      status: PlanRow["status"];
      payfastToken?: string;
      lastPaidAt?: string | null;
      failedAt?: string | null;
      nextBillingOn?: string | null;
    },
  ): Promise<void>;
};

export type ItnDeps = {
  passphrase: string;
  store: ItnStore;
  /** Asks PayFast whether this notification is genuine. */
  confirmWithPayfast(body: string): Promise<boolean>;
  now?: () => Date;
};

export type ItnResult = { status: number; message: string };

function addOneMonth(from: string | undefined, now: Date): string {
  const base = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T12:00:00Z`) : now;
  const next = new Date(base);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString().slice(0, 10);
}

export function createItnService(deps: ItnDeps) {
  const now = () => (deps.now ? deps.now() : new Date());

  return {
    async handle(pairs: Pair[], sourceIsPayfast: boolean): Promise<ItnResult> {
      if (!verifyItnSignature(pairs, deps.passphrase)) {
        return { status: 400, message: "Bad signature" };
      }
      if (!sourceIsPayfast) return { status: 403, message: "Not from PayFast" };

      const itn = parseItn(pairs);
      const plan = itn.subscriptionId
        ? await deps.store.findSubscription(itn.subscriptionId)
        : null;
      if (!plan) return { status: 400, message: "Unknown subscription" };

      if (itn.status === "COMPLETE" && !amountsMatch(itn.amountGross, plan.amountZar)) {
        return { status: 400, message: "Amount does not match the plan" };
      }
      if (!(await deps.confirmWithPayfast(confirmationBody(pairs)))) {
        return { status: 400, message: "PayFast did not confirm this" };
      }

      if (itn.pfPaymentId && (await deps.store.paymentSeen(itn.pfPaymentId))) {
        return { status: 200, message: "Already handled" };
      }

      const stamp = now().toISOString();
      if (itn.status === "COMPLETE") {
        await deps.store.recordPayment({
          tenantId: plan.tenantId,
          subscriptionId: plan.id,
          pfPaymentId: itn.pfPaymentId,
          amountZar: Number(itn.amountGross),
          status: "complete",
        });
        await deps.store.update(plan.id, {
          status: "active",
          payfastToken: itn.token || undefined,
          lastPaidAt: stamp,
          failedAt: null,
          nextBillingOn: addOneMonth(itn.billingDate, now()),
        });
      } else if (itn.status === "FAILED") {
        if (itn.pfPaymentId) {
          await deps.store.recordPayment({
            tenantId: plan.tenantId,
            subscriptionId: plan.id,
            pfPaymentId: itn.pfPaymentId,
            amountZar: Number(itn.amountGross || plan.amountZar),
            status: "failed",
          });
        }
        await deps.store.update(plan.id, { status: "failed", failedAt: stamp });
      } else if (itn.status === "CANCELLED") {
        await deps.store.update(plan.id, { status: "cancelled" });
      }
      return { status: 200, message: "OK" };
    },
  };
}
