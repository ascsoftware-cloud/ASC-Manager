import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { startCheckoutFn } from "@/lib/billing";
import { goToPayfast, usePlan, type Plan } from "@/lib/billing-data";
import { formatDay, formatZar } from "@/lib/format";
import { friendlyError } from "@/lib/mutate";
import { useAscStore, useCurrentUser } from "@/lib/store";
import { getSupabase } from "@/lib/supabase/client";
import { toast } from "sonner";

const STATUS: Record<Plan["status"], { label: string; tone: "good" | "warn" | "bad" | "neutral" }> =
  {
    awaiting: { label: "Not set up yet", tone: "warn" },
    active: { label: "Active", tone: "good" },
    failed: { label: "Payment failed", tone: "bad" },
    cancelled: { label: "Cancelled", tone: "neutral" },
  };

/** "Your monthly plan" on the client's Billing page. Hidden until we have set one up for them. */
export function ClientPlanCard() {
  const user = useCurrentUser();
  const { plan, payments } = usePlan(user?.clientId);
  const [busy, setBusy] = useState(false);
  const clientName = useAscStore((s) => s.clients.find((c) => c.id === user?.clientId)?.name);
  if (!plan || !user) return null;

  async function pay() {
    setBusy(true);
    try {
      const token = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
      if (!token) throw new Error("You have been signed out. Sign in again.");
      goToPayfast(await startCheckoutFn({ data: { accessToken: token } }));
    } catch (e) {
      toast.error(friendlyError(e));
      setBusy(false);
    }
  }

  const status = STATUS[plan.status];
  const recent = payments.slice(0, 6);

  return (
    <Surface>
      <SectionHeader
        inset
        title="Your monthly plan"
        action={<StatusBadge tone={status.tone} label={status.label} />}
      />
      <div className="flex flex-col gap-4 p-5">
        <div>
          <p className="type-stat">
            {formatZar(plan.amountZar)}
            <span className="type-body font-normal text-muted-foreground"> a month</span>
          </p>
          <p className="type-small text-muted-foreground">
            {plan.item}
            {clientName ? ` for ${clientName}` : ""}
          </p>
        </div>

        {plan.status === "awaiting" ? (
          <>
            <p className="type-body text-muted-foreground">
              Pay by card and it comes off automatically each month. You enter your card on
              PayFast&apos;s secure page, so we never see it.
            </p>
            <div>
              <Button onClick={() => void pay()} disabled={busy}>
                <CreditCard className="size-4" />
                {busy ? "Taking you to PayFast…" : "Set up monthly payment"}
              </Button>
            </div>
          </>
        ) : null}

        {plan.status === "failed" ? (
          <>
            <p className="type-body">
              Your last payment did not go through. Update your card to keep your plan going.
            </p>
            <div>
              <Button onClick={() => void pay()} disabled={busy}>
                <CreditCard className="size-4" />
                {busy ? "Taking you to PayFast…" : "Fix my payment"}
              </Button>
            </div>
          </>
        ) : null}

        {plan.status === "active" ? (
          <p className="type-body text-muted-foreground">
            {plan.nextBillingOn
              ? `Your next payment is on ${formatDay(plan.nextBillingOn)}.`
              : "Your payments come off automatically each month."}{" "}
            To change or stop it,{" "}
            <Link to="/requests" className="font-medium text-primary hover:underline">
              ask us
            </Link>
            .
          </p>
        ) : null}

        {plan.status === "cancelled" ? (
          <p className="type-body text-muted-foreground">
            This plan was cancelled. To start again,{" "}
            <Link to="/requests" className="font-medium text-primary hover:underline">
              ask us
            </Link>
            .
          </p>
        ) : null}
      </div>

      {recent.length > 0 ? (
        <div className="border-t border-border">
          <p className="type-label px-5 pt-4">Recent payments</p>
          <ul className="divide-y divide-border">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="type-body">{formatDay(p.paidAt)}</span>
                <span className="flex items-center gap-3">
                  <span className="type-body">{formatZar(p.amountZar)}</span>
                  <StatusBadge
                    tone={p.status === "complete" ? "good" : "bad"}
                    label={p.status === "complete" ? "Paid" : "Failed"}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Surface>
  );
}
