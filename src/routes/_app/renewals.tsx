import { createFileRoute } from "@tanstack/react-router";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { PageHeader, Surface } from "@/components/page-header";
import { formatDay } from "@/lib/format";
import { useAscStore, useCurrentUser, visibleClientIds } from "@/lib/store";

export const Route = createFileRoute("/_app/renewals")({
  component: RenewalsPage,
});

function RenewalsPage() {
  const user = useCurrentUser();
  const store = useAscStore();
  const ids = visibleClientIds(store, user);
  const rows = store.renewals
    .filter((r) => ids.includes(r.clientId))
    .slice()
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Renewals"
        title="Renewals"
        description={
          user?.role === "operator"
            ? "Domains, hosting and certificates across every client."
            : "What we renew for you, and when it is due."
        }
      />
      <Surface>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {user?.role === "operator" ? (
                <th className="px-5 py-3 font-medium">Client</th>
              ) : null}
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Expires</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const client = store.clients.find((c) => c.id === r.clientId);
              const days = differenceInCalendarDays(parseISO(r.expiresAt), new Date());
              return (
                <tr key={r.id} className="border-b border-border last:border-0">
                  {user?.role === "operator" ? (
                    <td className="px-5 py-4 text-champagne">{client?.name}</td>
                  ) : null}
                  <td className="px-5 py-4 text-champagne">{r.item}</td>
                  <td className="px-5 py-4 capitalize text-muted-foreground">{r.type}</td>
                  <td className="px-5 py-4">
                    <p className="text-gold">{formatDay(r.expiresAt)}</p>
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
