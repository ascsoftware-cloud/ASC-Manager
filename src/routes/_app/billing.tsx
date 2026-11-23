import { Surface } from "@/components/ui/surface";
import { PermissionGate } from "@/components/permission-gate";
import { createFileRoute } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDay, formatZar } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/billing")({
  component: () => (
    <PermissionGate perm="billing">
      <BillingPage />
    </PermissionGate>
  ),
});

function BillingPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const setInvoiceStatus = useAscStore((s) => s.setInvoiceStatus);
  const ids = visibleClientIds(store, user);
  const invoices = store.invoices
    .filter((i) => ids.includes(i.clientId))
    .slice()
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const renewals = store.renewals
    .filter((r) => ids.includes(r.clientId))
    .slice()
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Billing"
        title="Billing"
        description="What you pay ASC — hosting, domains, and open invoices."
      />
      <Surface>
        <div className="border-b border-border px-5 py-3">
          <p className="type-label text-muted-foreground">
            Invoices
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border type-label text-muted-foreground">
              <th className="px-5 py-3 font-medium">Ref</th>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Due</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-border last:border-0">
                <td className="px-5 py-4 text-muted-foreground">{inv.ref}</td>
                <td className="px-5 py-4 text-foreground">{inv.item}</td>
                <td className="px-5 py-4 text-muted-foreground">{formatDay(inv.dueAt)}</td>
                <td className="px-5 py-4 text-foreground">{formatZar(inv.amountZar)}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={inv.status === "paid" ? "done" : "open"} />
                </td>
                <td className="px-5 py-4 text-right">
                  {inv.status === "due" && user?.role === "operator" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void saveAction("Marked paid", () =>
                          setInvoiceStatus(inv.id, "paid"),
                        );
                      }}
                    >
                      Mark paid
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
      <Surface>
        <div className="border-b border-border px-5 py-3">
          <p className="type-label text-muted-foreground">
            Renewals
          </p>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border type-label text-muted-foreground">
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Expires</th>
            </tr>
          </thead>
          <tbody>
            {renewals.map((r) => {
              const days = differenceInCalendarDays(parseISO(r.expiresAt), new Date());
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4 text-foreground">{r.item}</td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">{r.type}</td>
                  <td className="px-5 py-4">
                    <p className="text-foreground">{formatDay(r.expiresAt)}</p>
                    <p className="text-xs text-muted-foreground">in {days} days</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
