import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StaffGate } from "@/components/staff-gate";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { saveAction } from "@/lib/mutate";
import { useAscStore } from "@/lib/store";
import type { Monitor } from "@/lib/types";

export const Route = createFileRoute("/_app/monitors")({
  component: () => (
    <StaffGate>
      <MonitorsPage />
    </StaffGate>
  ),
});

function MonitorsPage() {
  const monitors = useAscStore((s) => s.monitors);
  const sites = useAscStore((s) => s.sites);
  const clients = useAscStore((s) => s.clients);
  const runChecks = useAscStore((s) => s.runChecks);

  const siteOf = (m: Monitor) => sites.find((s) => s.id === m.siteId);
  const clientOf = (m: Monitor) => clients.find((c) => c.id === siteOf(m)?.clientId)?.name ?? "";
  const order = { down: 0, unchecked: 1, up: 2 } as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monitors"
        description="Website and certificate checks. Run one when you need a fresh reading."
      />
      <DataTable
        label="Monitors"
        rows={monitors}
        getRowId={(m) => m.id}
        searchText={(m) => `${m.label} ${siteOf(m)?.name ?? ""} ${clientOf(m)}`}
        searchPlaceholder="Search checks, sites or clients"
        filters={[
          {
            id: "status",
            label: "All statuses",
            options: [
              { value: "down", label: "Down" },
              { value: "up", label: "Up" },
              { value: "unchecked", label: "Not checked" },
            ],
            match: (m, v) => m.status === v,
          },
        ]}
        initialSort={{ id: "status", dir: "asc" }}
        empty={{
          icon: Activity,
          title: "No monitors yet",
          detail: "Checks appear here once a site is added.",
        }}
        columns={[
          {
            id: "status",
            header: "Status",
            sort: (a, b) => order[a.status] - order[b.status],
            cell: (m) => <StatusBadge status={m.status} />,
          },
          { id: "check", header: "Check", cell: (m) => <span className="font-medium">{m.label}</span> },
          {
            id: "site",
            header: "Site",
            hideBelow: "sm",
            sort: (a, b) => (siteOf(a)?.name ?? "").localeCompare(siteOf(b)?.name ?? ""),
            cell: (m) => (
              <>
                <p>{siteOf(m)?.name}</p>
                <p className="type-small text-muted-foreground">{clientOf(m)}</p>
              </>
            ),
          },
          {
            id: "uptime",
            header: "Uptime, 30 days",
            hideBelow: "lg",
            sort: (a, b) => (a.uptime30 ?? -1) - (b.uptime30 ?? -1),
            cell: (m) => (m.uptime30 == null ? "No data" : `${m.uptime30}%`),
          },
          {
            id: "last",
            header: "Last checked",
            hideBelow: "md",
            sort: (a, b) => (a.lastCheckedAt ?? "").localeCompare(b.lastCheckedAt ?? ""),
            cell: (m) => (m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : "Never"),
          },
          {
            id: "run",
            header: "Actions",
            align: "right",
            cell: (m) => (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const site = siteOf(m);
                  if (site) void saveAction("Check finished", () => runChecks(site.id));
                }}
              >
                Run check
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
