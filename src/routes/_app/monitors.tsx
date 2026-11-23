import { Surface } from "@/components/ui/surface";
import { createFileRoute } from "@tanstack/react-router";
import { StaffGate } from "@/components/staff-gate";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { useAscStore } from "@/lib/store";

export const Route = createFileRoute("/_app/monitors")({
  component: () => (
    <StaffGate>
      <MonitorsPage />
    </StaffGate>
  ),
});

function MonitorsPage() {
  const store = useAscStore();
  const runChecks = useAscStore((s) => s.runChecks);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Monitors"
        title="Monitors"
        description="HTTP and TLS checks on every system. Run a check when you need a fresh reading."
      />
      <Surface>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border type-small text-muted-foreground">
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Check</th>
              <th className="px-5 py-3 font-medium">System</th>
              <th className="px-5 py-3 font-medium">Last checked</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {store.monitors.map((m) => {
              const site = store.sites.find((s) => s.id === m.siteId);
              const client = store.clients.find((c) => c.id === site?.clientId);
              return (
                <tr key={m.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-4">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="px-5 py-4 text-foreground">{m.label}</td>
                  <td className="px-5 py-4">
                    <p className="text-foreground">{site?.name}</p>
                    <p className="text-xs text-muted-foreground">{client?.name}</p>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {m.lastCheckedAt ? formatRelative(m.lastCheckedAt) : "never"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (site) void runChecks(site.id);
                      }}
                    >
                      Run
                    </Button>
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
