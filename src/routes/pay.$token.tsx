import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleCheck, CreditCard } from "lucide-react";
import { ErrorPanel } from "@/components/error-panel";
import { AscLogo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { resolvePaymentLinkFn, type PaymentLinkView } from "@/lib/billing";
import { goToPayfast } from "@/lib/billing-data";
import { formatZar } from "@/lib/format";

export const Route = createFileRoute("/pay/$token")({
  validateSearch: (s: Record<string, unknown>): { done?: boolean } => ({
    done: s.done === "1" || s.done === 1 || s.done === true ? true : undefined,
  }),
  component: PayPage,
});

const SUPPORT_EMAIL = "admin@ascsoftware.co.za";

/** The page a payment link opens. No login. It shows a name and an amount, then goes to PayFast. */
function PayPage() {
  const { token } = Route.useParams();
  const { done } = Route.useSearch();
  const [view, setView] = useState<PaymentLinkView | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    resolvePaymentLinkFn({ data: { token } })
      .then((v) => !cancelled && setView(v))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <AscLogo className="size-16" />
        </div>

        {failed ? (
          <ErrorPanel
            title="We could not open that link"
            detail="Check your connection and try again."
            onRetry={() => window.location.reload()}
          />
        ) : view === null ? (
          <Surface className="space-y-3 p-6" aria-busy="true" aria-label="Loading">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-11 w-full" />
          </Surface>
        ) : view.state === "invalid" ? (
          <Surface className="p-6 text-center">
            <h1 className="type-section">This link has expired</h1>
            <p className="type-body mt-2 text-muted-foreground">
              Payment links only last a few days. Ask us for a new one at{" "}
              <a
                className="font-medium text-primary hover:underline"
                href={`mailto:${SUPPORT_EMAIL}`}
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Surface>
        ) : view.state === "active" || done ? (
          <Surface className="space-y-2 p-6 text-center">
            <CircleCheck className="mx-auto size-8 text-primary" aria-hidden="true" />
            <h1 className="type-section">
              {view.state === "active" ? "You are all set" : "Thank you"}
            </h1>
            <p className="type-body text-muted-foreground">
              {view.state === "active"
                ? "Your monthly payment is already running. There is nothing more to do."
                : "We are confirming your payment. It can take a minute. You do not need to do anything else."}
            </p>
          </Surface>
        ) : (
          <Surface className="space-y-5 p-6">
            <div className="space-y-1">
              <p className="type-label">Monthly payment</p>
              <h1 className="type-title">{view.clientName}</h1>
            </div>
            <div>
              <p className="type-stat">
                {formatZar(view.amountZar)}
                <span className="type-body font-normal text-muted-foreground"> a month</span>
              </p>
              <p className="type-small text-muted-foreground">{view.item}</p>
            </div>
            <p className="type-body text-muted-foreground">
              You pay by card on PayFast&apos;s secure page, and it comes off automatically each
              month. We never see your card details.
            </p>
            <Button
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                goToPayfast({ action: view.action, fields: view.fields });
              }}
            >
              <CreditCard className="size-4" />
              {busy ? "Taking you to PayFast…" : "Continue to PayFast"}
            </Button>
          </Surface>
        )}

        <p className="type-small text-center text-muted-foreground">
          Atlas Scale Collective (Pty) Ltd · Pretoria
        </p>
      </div>
    </main>
  );
}
