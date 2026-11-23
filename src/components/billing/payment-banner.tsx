import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { usePlan } from "@/lib/billing-data";
import { canUse } from "@/lib/permissions";
import { useCurrentUser } from "@/lib/store";

/** A slim notice across the top of the client desk while a monthly payment has failed. */
export function PaymentBanner() {
  const user = useCurrentUser();
  const { plan } = usePlan(user?.role === "client" ? user.clientId : null);
  if (!plan || plan.status !== "failed" || !canUse(user, "billing")) return null;
  return (
    <div
      role="status"
      className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 sm:px-8"
    >
      <p className="type-small mx-auto flex w-full max-w-[72rem] flex-wrap items-center gap-x-2 gap-y-1 text-foreground">
        <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
        Your last monthly payment did not go through.
        <Link
          to="/billing"
          className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline sm:min-h-0"
        >
          Fix it now
        </Link>
      </p>
    </div>
  );
}
