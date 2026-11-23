import { useEffect, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger";
import { Field, NativeSelect } from "@/components/page-header";
import { SectionHeader } from "@/components/section-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";
import { cancelSubscriptionFn, createPaymentLinkFn, setPlanFn } from "@/lib/billing";
import { usePlan } from "@/lib/billing-data";
import {
  DATABASE_MONTHLY_ZAR,
  PACKAGES,
  priceMonthlyPlan,
  type PlanChoice,
} from "@/lib/billing-plans";
import { formatDay, formatZar } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { getSupabase } from "@/lib/supabase/client";

async function token(): Promise<string> {
  const t = (await getSupabase()?.auth.getSession())?.data.session?.access_token;
  if (!t) throw new Error("You have been signed out. Sign in again.");
  return t;
}

const STATUS = {
  awaiting: { label: "Waiting for the client to pay", tone: "warn" },
  active: { label: "Active", tone: "good" },
  failed: { label: "Payment failed", tone: "bad" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

/** Staff set what a client pays each month: pick their package, add the database if they have one. */
export function StaffPlanCard({ clientId }: { clientId: string }) {
  const { plan, payments, unavailable, reload } = usePlan(clientId);
  const [choice, setChoice] = useState<PlanChoice>("starter");
  const [database, setDatabase] = useState(false);
  const [custom, setCustom] = useState("");
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setChoice(plan.choice);
    setDatabase(plan.hasDatabase);
    setCustom(plan.choice === "custom" ? String(plan.amountZar) : "");
  }, [plan?.id, plan?.choice, plan?.hasDatabase, plan?.amountZar]); // eslint-disable-line react-hooks/exhaustive-deps

  if (unavailable) {
    return (
      <Surface>
        <SectionHeader inset title="Monthly plan" />
        <p className="type-body p-5 text-muted-foreground">
          Monthly billing is not switched on yet.
        </p>
      </Surface>
    );
  }

  const priced = priceMonthlyPlan({
    choice,
    database,
    customAmountZar: custom === "" ? undefined : Number(custom),
  });
  const running = plan?.status === "active";
  const status = plan ? STATUS[plan.status] : null;
  const dirty =
    !plan ||
    plan.choice !== choice ||
    plan.hasDatabase !== database ||
    (priced.ok && plan.amountZar !== priced.amountZar);

  return (
    <>
      <Surface>
        <SectionHeader
          inset
          title="Monthly plan"
          detail="What this client pays us each month. The build is once-off and billed as an invoice."
          action={status ? <StatusBadge tone={status.tone} label={status.label} /> : undefined}
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field label="Package">
            <NativeSelect
              value={choice}
              disabled={running}
              onChange={(e) => setChoice(e.target.value as PlanChoice)}
            >
              {PACKAGES.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.pages} {p.pages === "1" ? "page" : "pages"}),{" "}
                  {formatZar(p.monthlyZar)} a month
                </option>
              ))}
              <option value="custom">Custom amount</option>
            </NativeSelect>
          </Field>

          {choice === "custom" ? (
            <Field label="Monthly amount (rand)">
              <Input
                inputMode="decimal"
                value={custom}
                disabled={running}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="450"
              />
            </Field>
          ) : (
            <div className="flex flex-col justify-end">
              <p className="type-small text-muted-foreground">
                Build from {formatZar(PACKAGES.find((p) => p.key === choice)?.buildFromZar ?? 0)},
                once-off.
              </p>
            </div>
          )}

          <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3 sm:col-span-2">
            <span>
              <span className="type-body block font-medium">Database</span>
              <span className="type-small block text-muted-foreground">
                Optional, {formatZar(DATABASE_MONTHLY_ZAR)} a month on top of the package.
              </span>
            </span>
            <Switch
              checked={database}
              disabled={running}
              onCheckedChange={setDatabase}
              aria-label="Database"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <div>
              <p className="type-label">They pay each month</p>
              <p className="type-stat">{priced.ok ? formatZar(priced.amountZar) : "—"}</p>
              <p className="type-small text-muted-foreground">
                {priced.ok ? priced.item : priced.error}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!priced.ok || !dirty || running}
                onClick={() => {
                  void saveAction("Plan saved", async () => {
                    await setPlanFn({
                      data: {
                        accessToken: await token(),
                        tenantId: clientId,
                        choice,
                        database,
                        customAmountZar: custom === "" ? undefined : Number(custom),
                      },
                    });
                    await reload();
                  });
                }}
              >
                Save plan
              </Button>
            </div>
          </div>
          {running ? (
            <p className="type-small text-muted-foreground sm:col-span-2">
              This plan is running. To change it, cancel it first, then set the new package.
            </p>
          ) : null}
        </div>

        {plan ? (
          <div className="flex flex-wrap gap-2 border-t border-border p-5">
            {plan.status !== "active" && plan.status !== "cancelled" ? (
              <Button
                variant="outline"
                onClick={() => {
                  void saveAction("Payment link ready", async () => {
                    setLink(
                      await createPaymentLinkFn({
                        data: { accessToken: await token(), tenantId: clientId },
                      }),
                    );
                  });
                }}
              >
                <Link2 className="size-4" />
                Create payment link
              </Button>
            ) : null}
            {plan.status !== "cancelled" ? (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setCancelOpen(true)}
              >
                Cancel plan
              </Button>
            ) : null}
            {plan.nextBillingOn && plan.status === "active" ? (
              <p className="type-small ml-auto self-center text-muted-foreground">
                Next payment {formatDay(plan.nextBillingOn)}
              </p>
            ) : null}
          </div>
        ) : null}

        {payments.length > 0 ? (
          <div className="border-t border-border">
            <p className="type-label px-5 pt-4">Payments</p>
            <ul className="divide-y divide-border">
              {payments.slice(0, 8).map((p) => (
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

      <Dialog open={Boolean(link)} onOpenChange={(v) => !v && (setLink(null), setCopied(false))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment link</DialogTitle>
            <DialogDescription>
              Send this to the person who pays. It needs no login and stops working{" "}
              {link ? formatDay(link.expiresAt) : ""}. You will not be shown it again.
            </DialogDescription>
          </DialogHeader>
          <Input
            readOnly
            value={link?.url ?? ""}
            aria-label="Payment link"
            onFocus={(e) => e.currentTarget.select()}
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!link) return;
                void navigator.clipboard.writeText(link.url).then(() => setCopied(true));
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDangerDialog
        open={cancelOpen}
        title="Cancel this monthly plan?"
        description="No more payments will be taken. If they have already paid, nothing is refunded here. You can set a plan up again later."
        confirmLabel="Cancel plan"
        onOpenChange={setCancelOpen}
        onConfirm={async () => {
          const ok = await saveAction("Plan cancelled", async () => {
            await cancelSubscriptionFn({
              data: { accessToken: await token(), tenantId: clientId },
            });
            await reload();
          });
          if (ok) setCancelOpen(false);
        }}
      />
    </>
  );
}
