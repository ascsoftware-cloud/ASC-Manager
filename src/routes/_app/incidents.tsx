import { createFileRoute } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StaffGate } from "@/components/staff-gate";
import { StatusBadge } from "@/components/status-badge";
import { formatRelative } from "@/lib/format";
import { useAscStore } from "@/lib/store";
import type { Incident } from "@/lib/types";

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

  const siteOf = (i: Incident) => sites.find((s) => s.id === i.siteId);
  const clientOf = (i: Incident) => clients.find((c) => c.id === siteOf(i)?.clientId)?.name ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Incidents"
        description="Outages and failed checks. Quiet is the goal."
      />
      <DataTable
        label="Incidents"
        rows={incidents}
        getRowId={(i) => i.id}
        searchText={(i) => `${i.title} ${siteOf(i)?.name ?? ""} ${clientOf(i)}`}
        searchPlaceholder="Search incidents"
        filters={[
          {
            id: "status",
            label: "All statuses",
            options: [
              { value: "open", label: "Open" },
              { value: "resolved", label: "Resolved" },
            ],
            match: (i, v) => i.status === v,
          },
        ]}
        initialSort={{ id: "opened", dir: "desc" }}
        empty={{
          icon: TriangleAlert,
          title: "No incidents",
          detail: "A failed check will show up here.",
        }}
        columns={[
          {
            id: "title",
            header: "Incident",
            sort: (a, b) => a.title.localeCompare(b.title),
            cell: (i) => <span className="font-medium">{i.title}</span>,
          },
          {
            id: "site",
            header: "Client and site",
            hideBelow: "sm",
            sort: (a, b) => clientOf(a).localeCompare(clientOf(b)),
            cell: (i) => (
              <>
                <p>{clientOf(i)}</p>
                <p className="type-small text-muted-foreground">{siteOf(i)?.name}</p>
              </>
            ),
          },
          {
            id: "opened",
            header: "Opened",
            hideBelow: "md",
            sort: (a, b) => a.openedAt.localeCompare(b.openedAt),
            cell: (i) => formatRelative(i.openedAt),
          },
          {
            id: "status",
            header: "Status",
            sort: (a, b) => a.status.localeCompare(b.status),
            cell: (i) => (
              <StatusBadge status={i.status === "open" ? "down" : "resolved"} label={i.status === "open" ? "Open" : "Resolved"} />
            ),
          },
        ]}
      />
    </div>
  );
}
