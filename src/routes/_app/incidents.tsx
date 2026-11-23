import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { createFileRoute } from "@tanstack/react-router";
import { StaffGate } from "@/components/staff-gate";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatRelative } from "@/lib/format";
import { useAscStore } from "@/lib/store";

export const Route = createFileRoute("/_app/incidents")({
  component: () => (
    <StaffGate>
      <IncidentsPage />
    </StaffGate>
  ),
});

function IncidentsPage() {
  const incidents = useAscStore((s) => s.incidents);
  const sites = useAscStore((s) => s.sites);
  const clients = useAscStore((s) => s.clients);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Incidents"
        title="Incidents"
        description="Outages and degraded checks. Quiet is the goal."
      />
      {incidents.length === 0 ? (
        <Surface>
          <EmptyState
            title="Nothing open"
            detail="No incidents on the book. Checks that fail will land here."
          />
        </Surface>
      ) : (
        <Surface>
          <ul className="divide-y divide-border">
            {incidents.map((i) => {
              const site = sites.find((s) => s.id === i.siteId);
              const client = clients.find((c) => c.id === site?.clientId);
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-foreground">{i.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {client?.name} · {site?.name} · {formatRelative(i.openedAt)}
                    </p>
                  </div>
                  <StatusBadge status={i.status} />
                </li>
              );
            })}
          </ul>
        </Surface>
      )}
    </div>
  );
}
